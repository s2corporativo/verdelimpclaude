-- Bancos existentes não executam seed durante atualizações. Esta migration
-- garante a presença do papel DIRETORIA e suas permissões empresariais.
INSERT INTO "Role" (id, name, description, "createdAt")
VALUES ('role-diretoria', 'DIRETORIA', 'Diretoria e alçadas executivas', NOW())
ON CONFLICT (name) DO UPDATE
SET description = EXCLUDED.description;

-- A diretoria recebe os módulos empresariais existentes, exceto o módulo
-- administrativo de gestão de usuários/credenciais. A migration é idempotente.
INSERT INTO "RolePermission" (id, "roleId", "permissionId")
SELECT
  'rp-dir-' || md5(permission.id),
  role.id,
  permission.id
FROM "Role" role
CROSS JOIN "Permission" permission
WHERE role.name = 'DIRETORIA'
  AND permission.module <> 'admin'
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

DO $$
DECLARE
  role_count INTEGER;
  permission_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO role_count
  FROM "Role"
  WHERE name = 'DIRETORIA';

  SELECT COUNT(*) INTO permission_count
  FROM "RolePermission" role_permission
  JOIN "Role" role ON role.id = role_permission."roleId"
  JOIN "Permission" permission ON permission.id = role_permission."permissionId"
  WHERE role.name = 'DIRETORIA'
    AND permission.module <> 'admin';

  IF role_count <> 1 THEN
    RAISE EXCEPTION 'Papel DIRETORIA não foi provisionado corretamente';
  END IF;

  IF permission_count = 0 THEN
    RAISE EXCEPTION 'Papel DIRETORIA ficou sem permissões empresariais';
  END IF;
END $$;
