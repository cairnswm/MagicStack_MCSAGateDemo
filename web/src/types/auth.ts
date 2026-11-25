export interface Permission {
  id: number
  name: string
  value: number
}

export interface Role {
  id: number
  name: string
  description: string | null
  permissions: Permission[]
}

export interface User {
  id: number
  email: string
  active: number
  avatar: string | null
  lastname: string
  username: string
  firstname: string
  tenant_id: string
  date_created: string
}

export interface Profile {
  user: User
  roles: Role[]
  properties: { id: number; name: string; value: string }[]
  user_permissions: Permission[]
}

/** Shared response shape of login, register, validate and reset. */
export interface AuthResponse {
  token: string
  refreshToken: string
  profile: Profile
}

export interface TenantResponse {
  tenant: {
    id: number
    name: string
    uuid: string
    owner: string
    description: string | null
    date_created: string
  }
  settings: Record<string, string>
  properties: { name: string; value: string }[]
}

export interface RegisterInput {
  email: string
  password: string
  username: string
  firstname: string
  lastname: string
}
