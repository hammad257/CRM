/**
 * CRM database seed.
 *
 * Bootstraps:
 *   1. Permission catalog (identity + core CRM domains).
 *   2. CRM-focused roles and their grants.
 *   3. One SUPER_ADMIN user for first login.
 *
 * Removes legacy (non-CRM) permissions from earlier seeds and drops obsolete
 * roles that have no users assigned.
 *
 * Re-runnable: idempotent upserts for permissions and roles.
 *
 * Usage:
 *   npx prisma db seed
 */
import { PrismaClient, Prisma } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as argon2 from 'argon2';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set. Add it to your .env file.');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

// -----------------------------------------------------------------------------
// Permission catalog — code format: "<module>.<resource>.<action>" (lowercase)
// -----------------------------------------------------------------------------

const STANDARD = ['read', 'create', 'update', 'delete'] as const;

const PERMISSION_GROUPS: Array<{
  module: string;
  resources: Record<string, string[]>;
}> = [
  {
    module: 'identity',
    resources: {
      user: [...STANDARD],
      role: [...STANDARD],
      permission: ['read'],
    },
  },
  {
    module: 'accounts',
    resources: {
      account: [...STANDARD, 'export'],
    },
  },
  {
    module: 'contacts',
    resources: {
      contact: [...STANDARD, 'export'],
    },
  },
  {
    module: 'customers',
    resources: {
      customer: [...STANDARD, 'export'],
      history: ['read', 'create'],
    },
  },
  {
    module: 'leads',
    resources: {
      lead: [...STANDARD, 'export', 'assign'],
    },
  },
  {
    module: 'deals',
    resources: {
      deal: [...STANDARD],
    },
  },
  {
    module: 'pipelines',
    resources: {
      pipeline: [...STANDARD],
      stage: [...STANDARD],
    },
  },
  {
    module: 'activities',
    resources: {
      activity: [...STANDARD],
    },
  },
  {
    module: 'tasks',
    resources: {
      task: [...STANDARD],
    },
  },
  {
    module: 'notes',
    resources: {
      note: [...STANDARD],
    },
  },
  {
    module: 'reports',
    resources: {
      report: ['read', 'export'],
    },
  },
  {
    module: 'settings',
    resources: {
      team: ['read', 'update'],
      workspace: ['read', 'update'],
    },
  },
];

const CRM_MODULES = new Set(PERMISSION_GROUPS.map((g) => g.module));

/** Modules from the old academic seed — safe to delete if you no longer need them. */
const LEGACY_MODULES = [
  'academic',
  'students',
  'employees',
  'courses',
  'attendance',
  'exams',
  'finance',
  'communication',
] as const;

// -----------------------------------------------------------------------------
// Role catalog — CRM org roles only
// -----------------------------------------------------------------------------

interface PermissionRow {
  id: string;
  code: string;
  module: string;
  resource: string;
  action: string;
}

interface RoleSpec {
  code: string;
  name: string;
  description: string;
  isSystem: boolean;
  permissionRule: (perms: PermissionRow[]) => PermissionRow[];
}

const ROLES: RoleSpec[] = [
  {
    code: 'SUPER_ADMIN',
    name: 'Super Admin',
    description: 'Full product access. System role; cannot be deleted.',
    isSystem: true,
    permissionRule: (perms) => perms,
  },
  {
    code: 'CRM_ADMIN',
    name: 'CRM Administrator',
    description:
      'User/role administration plus full access to accounts, pipeline, and data.',
    isSystem: false,
    permissionRule: (perms) =>
      perms.filter((p) => CRM_MODULES.has(p.module)),
  },
  {
    code: 'SALES_MANAGER',
    name: 'Sales Manager',
    description:
      'Manages the revenue team: all CRM data and reports; read-only on identity directory.',
    isSystem: false,
    permissionRule: (perms) =>
      perms.filter((p) => {
        if (p.module === 'identity') {
          return (
            ['user', 'role', 'permission'].includes(p.resource) &&
            p.action === 'read'
          );
        }
        return CRM_MODULES.has(p.module) && p.module !== 'identity';
      }),
  },
  {
    code: 'SALES_REP',
    name: 'Sales Representative',
    description:
      'Day-to-day selling: accounts, contacts, leads, deals, tasks, and activities; pipelines read-only.',
    isSystem: false,
    permissionRule: (perms) =>
      perms.filter((p) => {
        const fullCrudModules = [
          'accounts',
          'contacts',
          'customers',
          'leads',
          'deals',
          'activities',
          'tasks',
          'notes',
        ];
        if (fullCrudModules.includes(p.module)) return true;
        if (p.module === 'pipelines' && p.action === 'read') return true;
        if (p.module === 'reports' && p.action === 'read') return true;
        return false;
      }),
  },
  {
    code: 'MARKETING',
    name: 'Marketing',
    description:
      'Lead lifecycle and campaigns: full leads; create/update contacts; read accounts.',
    isSystem: false,
    permissionRule: (perms) =>
      perms.filter((p) => {
        if (p.module === 'leads') return true;
        if (
          p.module === 'customers' &&
          ['read', 'create', 'update'].includes(p.action)
        ) {
          return true;
        }
        if (
          p.module === 'contacts' &&
          ['read', 'create', 'update'].includes(p.action)
        ) {
          return true;
        }
        if (p.module === 'accounts' && p.action === 'read') return true;
        if (p.module === 'reports' && ['read', 'export'].includes(p.action)) {
          return true;
        }
        return false;
      }),
  },
  {
    code: 'VIEWER',
    name: 'Viewer',
    description: 'Read-only access across CRM modules (no identity admin).',
    isSystem: false,
    permissionRule: (perms) =>
      perms.filter(
        (p) =>
          p.action === 'read' &&
          p.module !== 'identity' &&
          CRM_MODULES.has(p.module),
      ),
  },
];

const ROOT_ADMIN = {
  email: 'admin@crm.local',
  password: 'ChangeMe!2026',
  firstName: 'Alex',
  lastName: 'Admin',
} as const;

// =============================================================================
// Seed implementation
// =============================================================================

async function removeLegacyPermissions(): Promise<void> {
  console.log('• Removing legacy (non-CRM) permissions…');
  const result = await prisma.permission.deleteMany({
    where: { module: { in: [...LEGACY_MODULES] } },
  });
  console.log(`  ↳ deleted ${result.count} legacy permission rows`);
}

async function seedPermissions(): Promise<void> {
  console.log('• Seeding CRM permissions…');
  const rows: Prisma.PermissionCreateManyInput[] = [];
  for (const group of PERMISSION_GROUPS) {
    for (const [resource, actions] of Object.entries(group.resources)) {
      for (const action of actions) {
        const code = `${group.module}.${resource}.${action}`.toLowerCase();
        rows.push({
          code,
          module: group.module,
          resource,
          action,
        });
      }
    }
  }

  for (const row of rows) {
    await prisma.permission.upsert({
      where: { code: row.code },
      update: {
        module: row.module,
        resource: row.resource,
        action: row.action,
      },
      create: row,
    });
  }
  const total = await prisma.permission.count();
  console.log(`  ↳ ${total} permission rows in database`);
}

async function seedRoles(): Promise<void> {
  console.log('• Seeding CRM roles…');
  const allPerms = await prisma.permission.findMany();

  for (const spec of ROLES) {
    const role = await prisma.role.upsert({
      where: { code: spec.code },
      update: {
        name: spec.name,
        description: spec.description,
        isSystem: spec.isSystem,
      },
      create: {
        code: spec.code,
        name: spec.name,
        description: spec.description,
        isSystem: spec.isSystem,
      },
    });

    const grants = spec.permissionRule(allPerms);
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    if (grants.length > 0) {
      await prisma.rolePermission.createMany({
        data: grants.map((p) => ({ roleId: role.id, permissionId: p.id })),
        skipDuplicates: true,
      });
    }
    console.log(`  ↳ ${role.code} (${grants.length} permissions)`);
  }
}

async function removeObsoleteRoles(): Promise<void> {
  const keep = new Set(ROLES.map((r) => r.code));
  const candidates = await prisma.role.findMany({
    where: {
      code: { notIn: [...keep] },
      isSystem: false,
    },
    include: { _count: { select: { users: true } } },
  });
  if (candidates.length === 0) return;
  console.log('• Cleaning obsolete roles (not in CRM catalog)…');
  for (const role of candidates) {
    if (role._count.users > 0) {
      console.warn(
        `  ↳ keep ${role.code} — still assigned to ${role._count.users} user(s)`,
      );
      continue;
    }
    await prisma.role.delete({ where: { id: role.id } });
    console.log(`  ↳ removed role ${role.code}`);
  }
}

async function migrateLegacyAdminRole(): Promise<void> {
  const oldAdmin = await prisma.role.findUnique({ where: { code: 'ADMIN' } });
  if (!oldAdmin) return;
  const crmAdmin = await prisma.role.findUnique({
    where: { code: 'CRM_ADMIN' },
  });
  if (!crmAdmin) return;

  const links = await prisma.userRole.findMany({
    where: { roleId: oldAdmin.id },
  });
  if (links.length === 0) {
    await prisma.role.delete({ where: { id: oldAdmin.id } });
    console.log('  ↳ removed legacy ADMIN role (no users)');
    return;
  }

  for (const link of links) {
    const hasCrmAdmin = await prisma.userRole.findUnique({
      where: {
        userId_roleId: { userId: link.userId, roleId: crmAdmin.id },
      },
    });
    if (hasCrmAdmin) {
      await prisma.userRole.delete({
        where: {
          userId_roleId: { userId: link.userId, roleId: oldAdmin.id },
        },
      });
    } else {
      await prisma.userRole.update({
        where: {
          userId_roleId: { userId: link.userId, roleId: oldAdmin.id },
        },
        data: { roleId: crmAdmin.id },
      });
    }
  }
  await prisma.role.delete({ where: { id: oldAdmin.id } });
  console.log(
    `  ↳ migrated legacy ADMIN → CRM_ADMIN (${links.length} user link(s))`,
  );
}

async function seedRootAdmin(): Promise<void> {
  console.log('• Seeding root SUPER_ADMIN…');
  const superAdmin = await prisma.role.findUnique({
    where: { code: 'SUPER_ADMIN' },
    select: { id: true },
  });
  if (!superAdmin) throw new Error('SUPER_ADMIN role missing — abort.');

  const existing = await prisma.user.findUnique({
    where: { email: ROOT_ADMIN.email },
  });
  if (existing) {
    console.log('  ↳ root admin already exists, skipping');
    return;
  }

  const passwordHash = await argon2.hash(ROOT_ADMIN.password, {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });

  await prisma.user.create({
    data: {
      email: ROOT_ADMIN.email,
      passwordHash,
      firstName: ROOT_ADMIN.firstName,
      lastName: ROOT_ADMIN.lastName,
      status: 'ACTIVE',
      roles: { create: [{ roleId: superAdmin.id }] },
      scope: { create: { campusIds: [], departmentIds: [] } },
    },
  });

  console.log(
    `  ↳ ${ROOT_ADMIN.email} created (password: ${ROOT_ADMIN.password} — change on first login)`,
  );
}

async function seedDefaultSalesPipeline(): Promise<void> {
  console.log('• Ensuring default sales pipeline…');
  const count = await prisma.pipeline.count();
  if (count > 0) {
    console.log('  ↳ pipeline(s) already exist, skipping default');
    return;
  }
  await prisma.pipeline.create({
    data: {
      name: 'Default Sales',
      description: 'Standard opportunity stages for lead-to-close tracking',
      isDefault: true,
      sortOrder: 0,
      stages: {
        create: [
          { name: 'Qualification', sortOrder: 0, winProbability: 10 },
          { name: 'Discovery', sortOrder: 1, winProbability: 20 },
          { name: 'Proposal', sortOrder: 2, winProbability: 40 },
          { name: 'Negotiation', sortOrder: 3, winProbability: 65 },
          { name: 'Verbal commit', sortOrder: 4, winProbability: 85 },
        ],
      },
    },
  });
  console.log('  ↳ Default Sales pipeline + stages created');
}

async function main(): Promise<void> {
  await removeLegacyPermissions();
  await seedPermissions();
  await seedRoles();
  await migrateLegacyAdminRole();
  await removeObsoleteRoles();
  await seedRootAdmin();
  await seedDefaultSalesPipeline();
  console.log('✔ Seed complete');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
