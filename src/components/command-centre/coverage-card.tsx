import { Layers3, Network } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CoverageBar } from "@/components/command-centre/coverage-bar";
import {
  type CoverageItem,
  type MaterialCategory,
  type OrganisationType,
  type SupplyChainRole,
} from "@/lib/landscape-core";

export type SupplyChainCoverageItem = CoverageItem<SupplyChainRole> & {
  typeCounts: Record<OrganisationType, number>;
};

export type MaterialCoverageItem = CoverageItem<MaterialCategory> & {
  typeCounts: Record<OrganisationType, number>;
};

export function SupplyChainCoverageCard({
  roles,
  visibleTypes,
  selectedKeys,
  contextLabel,
  onRoleToggle,
}: {
  roles: SupplyChainCoverageItem[];
  visibleTypes: OrganisationType[];
  selectedKeys: SupplyChainRole[];
  contextLabel?: string | null;
  onRoleToggle: (item: CoverageItem<SupplyChainRole>) => void;
}) {
  return (
    <Card size="sm" data-tour="supply-chain-coverage">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Supply-chain coverage{contextLabel ? `: ${contextLabel}` : ""}
            </p>
            <CardTitle className="mt-1">How the ecosystem is structured</CardTitle>
          </div>
          <Network aria-hidden="true" className="text-muted-foreground" size={24} />
        </div>
      </CardHeader>
      <CardContent className="grid gap-2">
        {roles.map((item) => (
          <CoverageBar
            key={item.key}
            item={item}
            stackedTypes={visibleTypes}
            selected={selectedKeys.includes(item.key)}
            onSelect={onRoleToggle}
          />
        ))}
      </CardContent>
    </Card>
  );
}

export function MaterialCoverageCard({
  materials,
  visibleTypes,
  selectedKeys,
  contextLabel,
  onMaterialToggle,
}: {
  materials: MaterialCoverageItem[];
  visibleTypes: OrganisationType[];
  selectedKeys: MaterialCategory[];
  contextLabel?: string | null;
  onMaterialToggle: (item: CoverageItem<MaterialCategory>) => void;
}) {
  return (
    <Card size="sm" data-tour="material-intelligence">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Material intelligence{contextLabel ? `: ${contextLabel}` : ""}
            </p>
            <CardTitle className="mt-1">
              What technologies the landscape is built around
            </CardTitle>
          </div>
          <Layers3 aria-hidden="true" className="text-muted-foreground" size={24} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2">
          {materials.map((item) => (
            <CoverageBar
              key={item.key}
              item={item}
              stackedTypes={visibleTypes}
              selected={selectedKeys.includes(item.key)}
              onSelect={onMaterialToggle}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
