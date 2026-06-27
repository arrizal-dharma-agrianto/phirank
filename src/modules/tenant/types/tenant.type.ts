type Tenant = {
  membershipId: string;
  role: {
    name: string;
    slug: string;
  };
  tenant: {
    id: string;
    name: string;
    slug: string;
    status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  };
};

type TenantSettings = {
  id: string;
  timezone: string;
  locale: string;
  currency: string;
  showSetupProgress: boolean;
};

export type { Tenant, TenantSettings };
