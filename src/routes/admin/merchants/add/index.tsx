import { createFileRoute } from "@tanstack/react-router";
import { CreateMemberPage } from "../index";
export const Route = createFileRoute("/admin/merchants/add/")({ component: CreateMemberPage });
