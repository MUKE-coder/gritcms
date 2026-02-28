"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Save,
  Loader2,
  Plus,
  Trash2,
  X,
  DollarSign,
  Package,
  Pencil,
} from "@/lib/icons";
import { Dropzone, type UploadedFile } from "@/components/ui/dropzone";
import {
  useProduct,
  useUpdateProduct,
  useCreatePrice,
  useUpdatePrice,
  useDeletePrice,
  useCreateVariant,
  useUpdateVariant,
  useDeleteVariant,
} from "@/hooks/use-commerce";
import type { Product, Price, ProductVariant } from "@repo/shared/types";

// ---------------------------------------------------------------------------
// Types for local form state
// ---------------------------------------------------------------------------

type Tab = "details" | "pricing" | "variants";

interface PriceForm {
  amount: number;
  currency: string;
  type: "one_time" | "subscription";
  interval: "month" | "year";
  trial_days: number;
}

interface VariantForm {
  name: string;
  sku: string;
  price_override: number | null;
  stock_quantity: number | null;
}

const emptyPriceForm: PriceForm = {
  amount: 0,
  currency: "USD",
  type: "one_time",
  interval: "month",
  trial_days: 0,
};

const emptyVariantForm: VariantForm = {
  name: "",
  sku: "",
  price_override: null,
  stock_quantity: null,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function statusColor(status: string) {
  switch (status) {
    case "active":
      return "bg-success/10 text-success";
    case "archived":
      return "bg-danger/10 text-danger";
    case "inactive":
    default:
      return "bg-bg-elevated text-text-muted";
  }
}

function priceTypeBadge(type: string) {
  switch (type) {
    case "subscription":
      return "bg-accent/10 text-accent";
    case "one_time":
    default:
      return "bg-success/10 text-success";
  }
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
    minimumFractionDigits: 2,
  }).format(amount / 100);
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function ProductEditorPage() {
  const params = useParams();
  const productId = Number(params.id);

  // Data fetching
  const { data: product, isLoading } = useProduct(productId);

  // Mutations
  const { mutate: updateProduct, isPending: savingProduct } = useUpdateProduct();
  const { mutate: createPrice } = useCreatePrice();
  const { mutate: updatePrice } = useUpdatePrice();
  const { mutate: deletePrice } = useDeletePrice();
  const { mutate: createVariant } = useCreateVariant();
  const { mutate: updateVariant } = useUpdateVariant();
  const { mutate: deleteVariant } = useDeleteVariant();

  // Tab state
  const [activeTab, setActiveTab] = useState<Tab>("details");

  // Details form state
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<Product["type"]>("digital");
  const [status, setStatus] = useState<Product["status"]>("active");
  const [images, setImages] = useState<string[]>([]);
  const [downloadableFiles, setDownloadableFiles] = useState<Array<{ name: string; url: string }>>([]);
  const [initialized, setInitialized] = useState(false);

  // Pricing state
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [priceForm, setPriceForm] = useState<PriceForm>(emptyPriceForm);

  // Variant state
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [editingVariantId, setEditingVariantId] = useState<number | null>(null);
  const [variantForm, setVariantForm] = useState<VariantForm>(emptyVariantForm);

  // Initialize form from fetched data
  if (product && !initialized) {
    setName(product.name ?? "");
    setSlug(product.slug ?? "");
    setDescription(product.description ?? "");
    setType(product.type ?? "digital");
    setStatus(product.status ?? "active");
    setImages(product.images ?? []);
    setDownloadableFiles(product.downloadable_files ?? []);
    setInitialized(true);
  }

  // -------------------------------------------------------------------------
  // Handlers - Details
  // -------------------------------------------------------------------------

  const handleSaveProduct = () => {
    updateProduct({
      id: productId,
      name,
      slug,
      description,
      type,
      status,
      images,
      downloadable_files: downloadableFiles,
    });
  };

  // -------------------------------------------------------------------------
  // Handlers - Pricing
  // -------------------------------------------------------------------------

  const openAddPrice = () => {
    setPriceForm(emptyPriceForm);
    setShowPriceModal(true);
  };

  const handlePriceSubmit = () => {
    const sortOrder = (product?.prices?.length ?? 0) + 1;
    createPrice(
      {
        productId,
        amount: Math.round(priceForm.amount * 100),
        currency: priceForm.currency,
        type: priceForm.type,
        interval: priceForm.type === "subscription" ? priceForm.interval : "",
        trial_days: priceForm.type === "subscription" ? priceForm.trial_days : 0,
        sort_order: sortOrder,
      },
      {
        onSuccess: () => {
          setShowPriceModal(false);
          setPriceForm(emptyPriceForm);
        },
      }
    );
  };

  const handleDeletePrice = (priceId: number) => {
    if (confirm("Delete this price?")) {
      deletePrice({ productId, priceId });
    }
  };

  // -------------------------------------------------------------------------
  // Handlers - Variants
  // -------------------------------------------------------------------------

  const openAddVariant = () => {
    setVariantForm(emptyVariantForm);
    setEditingVariantId(null);
    setShowVariantModal(true);
  };

  const openEditVariant = (variant: ProductVariant) => {
    setVariantForm({
      name: variant.name,
      sku: variant.sku,
      price_override: variant.price_override != null ? variant.price_override / 100 : null,
      stock_quantity: variant.stock_quantity,
    });
    setEditingVariantId(variant.id);
    setShowVariantModal(true);
  };

  const handleVariantSubmit = () => {
    const priceOverrideCents = variantForm.price_override != null ? Math.round(variantForm.price_override * 100) : null;
    if (editingVariantId) {
      updateVariant(
        {
          productId,
          variantId: editingVariantId,
          name: variantForm.name,
          sku: variantForm.sku,
          price_override: priceOverrideCents,
          stock_quantity: variantForm.stock_quantity,
        },
        {
          onSuccess: () => {
            setShowVariantModal(false);
            setEditingVariantId(null);
            setVariantForm(emptyVariantForm);
          },
        }
      );
    } else {
      createVariant(
        {
          productId,
          name: variantForm.name,
          sku: variantForm.sku,
          price_override: priceOverrideCents,
          stock_quantity: variantForm.stock_quantity,
        },
        {
          onSuccess: () => {
            setShowVariantModal(false);
            setVariantForm(emptyVariantForm);
          },
        }
      );
    }
  };

  const handleDeleteVariant = (variantId: number) => {
    if (confirm("Delete this variant?")) {
      deleteVariant({ productId, variantId });
    }
  };

  // -------------------------------------------------------------------------
  // Sorted data
  // -------------------------------------------------------------------------

  const sortedPrices = [...(product?.prices ?? [])].sort(
    (a, b) => a.sort_order - b.sort_order
  );
  const variants = product?.variants ?? [];

  // -------------------------------------------------------------------------
  // Loading state
  // -------------------------------------------------------------------------

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <p className="text-text-secondary">Product not found.</p>
        <Link href="/products" className="text-accent hover:underline text-sm">
          Back to products
        </Link>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/products"
          className="rounded-lg p-1.5 hover:bg-bg-hover text-text-muted transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-foreground truncate">
            {product.name}
          </h1>
          <div className="flex items-center gap-3 mt-1">
            <span
              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusColor(product.status)}`}
            >
              {product.status}
            </span>
            <span className="text-text-muted text-sm capitalize">
              {product.type}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="flex gap-6">
          {(["details", "pricing", "variants"] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`relative pb-3 text-sm font-medium capitalize transition-colors ${
                activeTab === tab
                  ? "text-accent"
                  : "text-text-muted hover:text-foreground"
              }`}
            >
              {tab}
              {activeTab === tab && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-accent" />
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* ================================================================= */}
      {/* TAB 1: DETAILS                                                    */}
      {/* ================================================================= */}
      {activeTab === "details" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-bg-secondary p-6 space-y-5">
            <h2 className="text-lg font-semibold text-foreground">
              Product Details
            </h2>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Product name"
                  className="w-full rounded-lg border border-border bg-bg-elevated px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Slug
                </label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="product-slug"
                  className="w-full rounded-lg border border-border bg-bg-elevated px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Product description..."
                  rows={5}
                  className="w-full rounded-lg border border-border bg-bg-elevated px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none resize-y"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Type
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as Product["type"])}
                  className="w-full rounded-lg border border-border bg-bg-elevated px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                >
                  <option value="digital">Digital</option>
                  <option value="physical">Physical</option>
                  <option value="course">Course</option>
                  <option value="membership">Membership</option>
                  <option value="service">Service</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) =>
                    setStatus(e.target.value as Product["status"])
                  }
                  className="w-full rounded-lg border border-border bg-bg-elevated px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              {/* Product Images */}
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Product Images
                </label>
                <Dropzone
                  variant="default"
                  maxFiles={10}
                  maxSize={5 * 1024 * 1024}
                  accept={{ "image/*": [".jpg", ".jpeg", ".png", ".gif", ".webp"] }}
                  value={images.map((url, i) => ({ url, name: `image-${i + 1}`, size: 0, type: "image/jpeg" } as UploadedFile))}
                  onFilesChange={(files) => setImages(files.map((f) => f.url))}
                  description="Upload up to 10 product images (max 5MB each)"
                />
              </div>

              {/* Downloadable Files (for digital products) */}
              {(type === "digital" || type === "membership") && (
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Downloadable Files
                  </label>
                  <Dropzone
                    variant="inline"
                    maxFiles={20}
                    maxSize={150 * 1024 * 1024}
                    onFilesChange={(files) => setDownloadableFiles(files.map((f) => ({ name: f.name, url: f.url })))}
                    value={downloadableFiles.map((f) => ({ url: f.url, name: f.name, size: 0, type: "application/octet-stream" } as UploadedFile))}
                    description="Upload files customers will receive after purchase (max 150MB each)"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={handleSaveProduct}
                disabled={savingProduct || !name.trim()}
                className="flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50 transition-colors"
              >
                <Save className="h-4 w-4" />
                {savingProduct ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* TAB 2: PRICING                                                    */}
      {/* ================================================================= */}
      {activeTab === "pricing" && (
        <div className="space-y-4">
          {/* Pricing header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Prices</h2>
              <p className="text-sm text-text-muted mt-0.5">
                Manage pricing options for this product.
              </p>
            </div>
            <button
              onClick={openAddPrice}
              className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Price
            </button>
          </div>

          {/* Price list */}
          {sortedPrices.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-bg-secondary p-12 text-center">
              <div className="flex justify-center mb-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10">
                  <DollarSign className="h-7 w-7 text-accent" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-1">
                No prices yet
              </h3>
              <p className="text-sm text-text-muted mb-5">
                Add a price to start selling this product.
              </p>
              <button
                onClick={openAddPrice}
                className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add Price
              </button>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {sortedPrices.map((price) => (
                <div
                  key={price.id}
                  className="rounded-xl border border-border bg-bg-secondary p-5 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-2xl font-bold text-foreground">
                        {formatCurrency(price.amount, price.currency)}
                      </p>
                      <p className="text-xs text-text-muted uppercase mt-0.5">
                        {price.currency}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeletePrice(price.id)}
                      className="rounded-lg p-1.5 text-text-muted hover:bg-danger/10 hover:text-danger transition-colors"
                      title="Delete price"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${priceTypeBadge(price.type)}`}
                    >
                      {price.type === "one_time" ? "One-time" : "Subscription"}
                    </span>

                    {price.type === "subscription" && price.interval && (
                      <span className="inline-flex rounded-full bg-bg-elevated px-2.5 py-0.5 text-xs font-medium text-text-secondary capitalize">
                        {price.interval === "month" ? "Monthly" : "Yearly"}
                      </span>
                    )}

                    {price.type === "subscription" && price.trial_days > 0 && (
                      <span className="inline-flex rounded-full bg-warning/10 px-2.5 py-0.5 text-xs font-medium text-warning">
                        {price.trial_days}-day trial
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* TAB 3: VARIANTS                                                   */}
      {/* ================================================================= */}
      {activeTab === "variants" && (
        <div className="space-y-4">
          {/* Variants header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Variants
              </h2>
              <p className="text-sm text-text-muted mt-0.5">
                Manage product variants such as sizes, colors, or editions.
              </p>
            </div>
            <button
              onClick={openAddVariant}
              className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Variant
            </button>
          </div>

          {/* Variant list */}
          {variants.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-bg-secondary p-12 text-center">
              <div className="flex justify-center mb-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10">
                  <Package className="h-7 w-7 text-accent" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-1">
                No variants yet
              </h3>
              <p className="text-sm text-text-muted mb-5">
                Add variants if this product comes in different options.
              </p>
              <button
                onClick={openAddVariant}
                className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add Variant
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {variants.map((variant) => (
                <div
                  key={variant.id}
                  className="rounded-xl border border-border bg-bg-secondary p-5"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 shrink-0">
                      <Package className="h-5 w-5 text-accent" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-foreground truncate">
                          {variant.name}
                        </h3>
                        {variant.sku && (
                          <span className="inline-flex rounded-full bg-bg-elevated px-2.5 py-0.5 text-xs font-medium text-text-muted shrink-0">
                            SKU: {variant.sku}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1">
                        {variant.price_override != null && (
                          <span className="text-sm text-text-secondary">
                            Price override:{" "}
                            <span className="font-medium text-foreground">
                              {formatCurrency(
                                variant.price_override,
                                product.prices?.[0]?.currency ?? "USD"
                              )}
                            </span>
                          </span>
                        )}
                        {variant.stock_quantity != null && (
                          <span className="text-sm text-text-secondary">
                            Stock:{" "}
                            <span className="font-medium text-foreground">
                              {variant.stock_quantity}
                            </span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => openEditVariant(variant)}
                        className="rounded-lg p-1.5 text-text-muted hover:bg-bg-elevated hover:text-foreground transition-colors"
                        title="Edit variant"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteVariant(variant.id)}
                        className="rounded-lg p-1.5 text-text-muted hover:bg-danger/10 hover:text-danger transition-colors"
                        title="Delete variant"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* PRICE MODAL                                                       */}
      {/* ================================================================= */}
      {showPriceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-xl border border-border bg-bg-secondary p-6 shadow-2xl mx-4">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-foreground">
                Add Price
              </h2>
              <button
                onClick={() => {
                  setShowPriceModal(false);
                  setPriceForm(emptyPriceForm);
                }}
                className="rounded-lg p-1.5 text-text-muted hover:bg-bg-hover transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Amount
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={priceForm.amount || ""}
                  onChange={(e) =>
                    setPriceForm({
                      ...priceForm,
                      amount: parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder="e.g. 19.99"
                  className="w-full rounded-lg border border-border bg-bg-elevated px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                  autoFocus
                />
                <p className="text-xs text-text-muted mt-1">
                  {priceForm.amount > 0
                    ? `Preview: ${formatCurrency(Math.round(priceForm.amount * 100), priceForm.currency)}`
                    : "Enter the price (e.g. 30 for $30.00)"}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Currency
                </label>
                <input
                  type="text"
                  value={priceForm.currency}
                  onChange={(e) =>
                    setPriceForm({
                      ...priceForm,
                      currency: e.target.value.toUpperCase(),
                    })
                  }
                  placeholder="USD"
                  maxLength={3}
                  className="w-full rounded-lg border border-border bg-bg-elevated px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Type
                </label>
                <select
                  value={priceForm.type}
                  onChange={(e) =>
                    setPriceForm({
                      ...priceForm,
                      type: e.target.value as PriceForm["type"],
                    })
                  }
                  className="w-full rounded-lg border border-border bg-bg-elevated px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                >
                  <option value="one_time">One-time</option>
                  <option value="subscription">Subscription</option>
                </select>
              </div>

              {priceForm.type === "subscription" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">
                      Billing Interval
                    </label>
                    <select
                      value={priceForm.interval}
                      onChange={(e) =>
                        setPriceForm({
                          ...priceForm,
                          interval: e.target.value as PriceForm["interval"],
                        })
                      }
                      className="w-full rounded-lg border border-border bg-bg-elevated px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                    >
                      <option value="month">Monthly</option>
                      <option value="year">Yearly</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">
                      Trial Days
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={priceForm.trial_days}
                      onChange={(e) =>
                        setPriceForm({
                          ...priceForm,
                          trial_days: parseInt(e.target.value) || 0,
                        })
                      }
                      placeholder="0"
                      className="w-full rounded-lg border border-border bg-bg-elevated px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setShowPriceModal(false);
                  setPriceForm(emptyPriceForm);
                }}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-bg-hover transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePriceSubmit}
                disabled={priceForm.amount <= 0}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50 transition-colors"
              >
                Add Price
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* VARIANT MODAL                                                     */}
      {/* ================================================================= */}
      {showVariantModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-xl border border-border bg-bg-secondary p-6 shadow-2xl mx-4">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-foreground">
                {editingVariantId ? "Edit Variant" : "Add Variant"}
              </h2>
              <button
                onClick={() => {
                  setShowVariantModal(false);
                  setEditingVariantId(null);
                  setVariantForm(emptyVariantForm);
                }}
                className="rounded-lg p-1.5 text-text-muted hover:bg-bg-hover transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={variantForm.name}
                  onChange={(e) =>
                    setVariantForm({ ...variantForm, name: e.target.value })
                  }
                  placeholder="e.g. Large, Blue, Premium"
                  className="w-full rounded-lg border border-border bg-bg-elevated px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  SKU
                </label>
                <input
                  type="text"
                  value={variantForm.sku}
                  onChange={(e) =>
                    setVariantForm({ ...variantForm, sku: e.target.value })
                  }
                  placeholder="e.g. PROD-LG-BLUE"
                  className="w-full rounded-lg border border-border bg-bg-elevated px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Price Override (optional)
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={variantForm.price_override ?? ""}
                  onChange={(e) =>
                    setVariantForm({
                      ...variantForm,
                      price_override: e.target.value
                        ? parseFloat(e.target.value)
                        : null,
                    })
                  }
                  placeholder="Leave empty to use default price"
                  className="w-full rounded-lg border border-border bg-bg-elevated px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                />
                {variantForm.price_override != null &&
                  variantForm.price_override > 0 && (
                    <p className="text-xs text-text-muted mt-1">
                      Preview:{" "}
                      {formatCurrency(
                        Math.round(variantForm.price_override * 100),
                        product.prices?.[0]?.currency ?? "USD"
                      )}
                    </p>
                  )}
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Stock Quantity (optional)
                </label>
                <input
                  type="number"
                  min={0}
                  value={variantForm.stock_quantity ?? ""}
                  onChange={(e) =>
                    setVariantForm({
                      ...variantForm,
                      stock_quantity: e.target.value
                        ? parseInt(e.target.value)
                        : null,
                    })
                  }
                  placeholder="Leave empty for unlimited"
                  className="w-full rounded-lg border border-border bg-bg-elevated px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setShowVariantModal(false);
                  setEditingVariantId(null);
                  setVariantForm(emptyVariantForm);
                }}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-bg-hover transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleVariantSubmit}
                disabled={!variantForm.name.trim()}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50 transition-colors"
              >
                {editingVariantId ? "Update Variant" : "Add Variant"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
