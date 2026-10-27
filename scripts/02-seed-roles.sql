-- Insert default roles with permissions

INSERT INTO roles (id, name, description, permissions) VALUES
(
    '00000000-0000-0000-0000-000000000001',
    'Super Admin',
    'Full system access across all branches',
    '{
        "branches": ["create", "read", "update", "delete", "manage_all"],
        "users": ["create", "read", "update", "delete", "assign_roles"],
        "customers": ["create", "read", "update", "delete", "view_all_branches"],
        "leads": ["create", "read", "update", "delete", "view_all_branches"],
        "financial": ["create", "read", "update", "delete", "view_all_branches"],
        "orders": ["create", "read", "update", "delete", "approve", "view_all_branches"],
        "files": ["create", "read", "update", "delete", "view_all_branches"],
        "reports": ["view_all_branches"],
        "settings": ["manage_system", "manage_branches"]
    }'::jsonb
),
(
    '00000000-0000-0000-0000-000000000002',
    'Branch Admin',
    'Full access within assigned branch',
    '{
        "branches": ["read", "update"],
        "users": ["create", "read", "update", "assign_roles"],
        "customers": ["create", "read", "update", "delete"],
        "leads": ["create", "read", "update", "delete", "assign"],
        "financial": ["create", "read", "update", "delete"],
        "orders": ["create", "read", "update", "approve"],
        "files": ["create", "read", "update"],
        "reports": ["view_branch"],
        "settings": ["manage_branch"]
    }'::jsonb
),
(
    '00000000-0000-0000-0000-000000000003',
    'Employee',
    'Standard employee access',
    '{
        "branches": ["read"],
        "users": ["read"],
        "customers": ["create", "read", "update"],
        "leads": ["create", "read", "update"],
        "financial": ["read"],
        "orders": ["create", "read", "update"],
        "files": ["create", "read"],
        "reports": ["view_own"],
        "settings": []
    }'::jsonb
),
(
    '00000000-0000-0000-0000-000000000004',
    'Field Staff',
    'Mobile field operations access',
    '{
        "branches": ["read"],
        "users": ["read"],
        "customers": ["read", "update"],
        "leads": ["create", "read", "update"],
        "financial": [],
        "orders": ["create", "read"],
        "files": ["create", "read"],
        "reports": ["view_own"],
        "settings": []
    }'::jsonb
),
(
    '00000000-0000-0000-0000-000000000005',
    'Accountant',
    'Financial and reporting access',
    '{
        "branches": ["read"],
        "users": ["read"],
        "customers": ["read"],
        "leads": ["read"],
        "financial": ["create", "read", "update", "delete"],
        "orders": ["read"],
        "files": ["read"],
        "reports": ["view_branch", "export"],
        "settings": []
    }'::jsonb
)
ON CONFLICT (id) DO NOTHING;
