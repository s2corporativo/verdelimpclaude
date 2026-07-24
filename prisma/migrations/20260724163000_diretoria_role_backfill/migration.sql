-- Bancos existentes não executam seed durante atualizações. Esta migration
-- garante a presença do papel DIRETORIA e associa todas as permissões
-- empresariais que já existirem no momento da atualização.
INSERT INTO "Role" (id, name, description, "createdAt")
VALUES ('role-diretoria', 'DIRETORIA', 'Diretoria e alçadas executivas', NOW())
ON CONFLICT (name) DO UPDATE
SET description = EXCLUDED.description;

-- Em banco existente, as permissões já foram semeadas e são vinculadas aqui.
-- Em instalação nova, a tabela Permission ainda pode estar vazia; o seed
-- estrutural executado depois das migrations fará os mesmos vínculos.
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
  available_permission_count INTEGER;
  assigned_permission_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO role_count
  FROM "Role"
  WHERE name = 'DIRETORIA';

  SELECT COUNT(*) INTO available_permission_count
  FROM "Permission"
  WHERE module <> 'admin';

  SELECT COUNT(*) INTO assigned_permission_count
  FROM "RolePermission" role_permission
  JOIN "Role" role ON role.id = role_permission."roleId"
  JOIN "Permission" permission ON permission.id = role_permission."permissionId"
  WHERE role.name = 'DIRETORIA'
    AND permission.module <> 'admin';

  IF role_count <> 1 THEN
    RAISE EXCEPTION 'Papel DIRETORIA não foi provisionado corretamente';
  END IF;

  IF available_permission_count > 0
     AND assigned_permission_count <> available_permission_count THEN
    RAISE EXCEPTION 'Permissões da DIRETORIA incompletas: % de %',
      assigned_permission_count,
      available_permission_count;
  END IF;
END $$;
