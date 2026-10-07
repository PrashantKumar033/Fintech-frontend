import { createFileRoute } from "@tanstack/react-router";
import { Store } from "lucide-react";
import { MasterDistributorModulePlaceholder } from "@/components/master-distributor/module-placeholder";
export const Route=createFileRoute("/master-distributor/network/retailers/")({component:Page});
function Page(){return <MasterDistributorModulePlaceholder active="merchants" icon={Store} title="Downstream retailers" description="Retailers managed through your Distributor network." pending="The backend does not yet expose a role-protected recursive retailer listing for a Master Distributor. This page is isolated and ready to consume that contract without exposing another network's data."/>}
