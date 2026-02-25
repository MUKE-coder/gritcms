import { defineResource } from "@/lib/resource";

export const usersResource = defineResource({
  name: "User",
  slug: "users",
  endpoint: "/api/users",
  icon: "Users",
  label: { singular: "User", plural: "Users" },

  table: {
    columns: [
      { key: "id", label: "ID", sortable: true, width: "80px" },
      { key: "first_name", label: "First Name", sortable: true, searchable: true },
      { key: "last_name", label: "Last Name", sortable: true, searchable: true },
      { key: "email", label: "Email", sortable: true, searchable: true },
      {
        key: "role",
        label: "Role",
        sortable: true,
        format: "badge",
        badge: {
          ADMIN: { color: "accent", label: "Admin" },
          EDITOR: { color: "info", label: "Editor" },
          USER: { color: "muted", label: "User" },
          // grit:role-badges
        },
      },
      { key: "job_title", label: "Job Title" },
      {
        key: "provider",
        label: "Provider",
        format: "badge",
        badge: {
          local: { color: "muted", label: "Email" },
          google: { color: "info", label: "Google" },
          github: { color: "accent", label: "GitHub" },
        },
      },
      { key: "active", label: "Status", format: "boolean" },
      { key: "created_at", label: "Created", format: "relative", sortable: true },
    ],
    filters: [
      {
        key: "role",
        label: "Role",
        type: "select",
        options: [
          { label: "Admin", value: "ADMIN" },
          { label: "Editor", value: "EDITOR" },
          { label: "User", value: "USER" },
          // grit:role-filters
        ],
      },
      { key: "active", label: "Status", type: "boolean" },
      {
        key: "provider",
        label: "Provider",
        type: "select",
        options: [
          { label: "Email", value: "local" },
          { label: "Google", value: "google" },
          { label: "GitHub", value: "github" },
        ],
      },
    ],
    searchable: true,
    searchPlaceholder: "Search by name or email...",
    actions: ["create", "view", "edit", "delete"],
    bulkActions: ["delete"],
    defaultSort: { key: "created_at", direction: "desc" },
    pageSize: 20,
  },

  form: {
    layout: "two-column",
    fields: [
      {
        key: "first_name",
        label: "First Name",
        type: "text",
        required: true,
        placeholder: "Enter first name",
        colSpan: 1,
      },
      {
        key: "last_name",
        label: "Last Name",
        type: "text",
        required: true,
        placeholder: "Enter last name",
        colSpan: 1,
      },
      {
        key: "email",
        label: "Email",
        type: "text",
        required: true,
        placeholder: "user@example.com",
        colSpan: 1,
      },
      {
        key: "password",
        label: "Password",
        type: "text",
        placeholder: "Enter password",
        description: "Required when creating a new user",
        colSpan: 1,
      },
      {
        key: "role",
        label: "Role",
        type: "select",
        required: true,
        options: [
          { label: "Admin", value: "ADMIN" },
          { label: "Editor", value: "EDITOR" },
          { label: "User", value: "USER" },
          // grit:role-options
        ],
        defaultValue: "USER",
        colSpan: 1,
      },
      {
        key: "job_title",
        label: "Job Title",
        type: "text",
        placeholder: "e.g. Software Engineer",
        colSpan: 1,
      },
      {
        key: "avatar",
        label: "Avatar",
        type: "image",
        description: "Profile picture",
        colSpan: 2,
      },
      {
        key: "active",
        label: "Active",
        type: "toggle",
        defaultValue: true,
        description: "Whether this user can log in",
        colSpan: 1,
      },
    ],
  },

  dashboard: {
    widgets: [
      {
        type: "stat",
        label: "Total Users",
        icon: "Users",
        color: "accent",
        endpoint: "/api/users?page_size=1",
        format: "number",
        colSpan: 1,
      },
      {
        type: "stat",
        label: "Active Users",
        icon: "UserCheck",
        color: "success",
        endpoint: "/api/users?active=true&page_size=1",
        format: "number",
        colSpan: 1,
      },
    ],
  },
});
