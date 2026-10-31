/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Plus,
  Search,
  Archive,
  Layers,
  Percent,
  CheckCircle,
  Tag,
  DollarSign
} from 'lucide-react';
import { Product, ProductVariant, ProductType } from '../types/index.ts';
import { formatINR, paiseToRupees, rupeesToPaise } from '../utils/finance.ts';
import { useAuth } from '../context/AuthContext.tsx';

interface ProductsViewProps {
  onNavigate: (view: string) => void;
}

export const ProductsView: React.FC<ProductsViewProps> = ({ onNavigate }) => {
  const { isAdmin } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  // Create Modal
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [type, setType] = useState<ProductType>('Software');
  const [salesRupees, setSalesRupees] = useState('25000');
  const [costRupees, setCostRupees] = useState('8000');
  const [description, setDescription] = useState('');
  const [variants, setVariants] = useState<{ attributeName: string; attributeValue: string; additionalRupees: string }[]>([
    { attributeName: 'Edition', attributeValue: 'Enterprise', additionalRupees: '15000' }
  ]);

  // SECTION 9: Product Details & Edit Modal state
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [detailedProduct, setDetailedProduct] = useState<any | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editSalesRupees, setEditSalesRupees] = useState('');
  const [editCostRupees, setEditCostRupees] = useState('');
  const [editType, setEditType] = useState<ProductType>('Software');
  const [editStatus, setEditStatus] = useState('active');
  const [isSaving, setIsSaving] = useState(false);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/products');
      const data = await res.json();
      setProducts(data.products || []);
    } catch (err) {
      console.error('Failed to load products', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDetails = async (prod: Product) => {
    setSelectedProduct(prod);
    setIsEditing(false);
    setEditName(prod.name);
    setEditDescription(prod.description);
    setEditSalesRupees(String(paiseToRupees(prod.salesPricePaise)));
    setEditCostRupees(String(paiseToRupees(prod.costPricePaise)));
    setEditType(prod.type);
    setEditStatus(prod.status);

    try {
      setDetailsLoading(true);
      const res = await fetch(`/api/products/${prod.id}`);
      if (res.ok) {
        const data = await res.json();
        setDetailedProduct(data);
      }
    } catch (err) {
      console.error('Failed to load full product details', err);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleSaveProductEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    try {
      setIsSaving(true);
      const res = await fetch(`/api/products/${selectedProduct.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          description: editDescription,
          type: editType,
          salesPricePaise: rupeesToPaise(editSalesRupees),
          costPricePaise: rupeesToPaise(editCostRupees),
          status: editStatus,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setIsEditing(false);
        await fetchProducts();
        await handleOpenDetails(data.product);
      }
    } catch (err) {
      console.error('Error updating product', err);
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleArchive = async (prod: Product) => {
    if (!confirm(`Archive product ${prod.name}? Existing subscriptions and invoices will keep their historical snapshot.`)) return;
    try {
      const res = await fetch(`/api/products/${prod.id}`, { method: 'DELETE' });
      if (res.ok) await fetchProducts();
    } catch (err) {
      console.error('Error archiving product', err);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const formattedVariants = variants.map(v => ({
        attributeName: v.attributeName,
        attributeValue: v.attributeValue,
        additionalPricePaise: rupeesToPaise(v.additionalRupees),
      }));

      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          code,
          type,
          salesPricePaise: rupeesToPaise(salesRupees),
          costPricePaise: rupeesToPaise(costRupees),
          description,
          variants: formattedVariants,
        }),
      });

      if (res.ok) {
        setShowModal(false);
        setName('');
        setCode('');
        await fetchProducts();
      }
    } catch (err) {
      console.error('Error creating product', err);
    }
  };

  const filtered = products.filter(p => {
    if (typeFilter !== 'all' && p.type.toLowerCase() !== typeFilter.toLowerCase()) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Box className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Products & Multi-Variant Catalog
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage Software, Services, Add-ons, and Physical terminals with live margin calculations.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Product</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-2 w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name or product code..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full text-xs bg-transparent text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          {['all', 'Software', 'Service', 'Add-on', 'Physical'].map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer capitalize ${
                typeFilter.toLowerCase() === t.toLowerCase()
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map(prod => {
          // Live Margin Calculation (Section 4)
          const marginPercent = prod.salesPricePaise > 0
            ? Math.round(((prod.salesPricePaise - prod.costPricePaise) / prod.salesPricePaise) * 100)
            : 0;

          return (
            <div
              key={prod.id}
              className={`bg-white dark:bg-slate-900 border rounded-2xl p-5 shadow-xs flex flex-col justify-between transition-all ${
                prod.status === 'archived'
                  ? 'border-slate-200 dark:border-slate-800 opacity-60'
                  : 'border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    {prod.code}
                  </span>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      prod.type === 'Software'
                        ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400'
                        : prod.type === 'Service'
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                        : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                    }`}
                  >
                    {prod.type}
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {prod.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                    {prod.description}
                  </p>
                </div>

                {/* Price & Margin Pill */}
                <div className="p-3 bg-slate-50 dark:bg-slate-950/50 rounded-xl border border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-semibold">Base Price</span>
                    <div className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                      {formatINR(prod.salesPricePaise)}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 text-[10px] uppercase font-semibold">Gross Margin</span>
                    <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                      {marginPercent}%
                    </div>
                  </div>
                </div>

                {/* Variants preview */}
                {prod.variants.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                      Available Variants ({prod.variants.length})
                    </span>
                    <div className="space-y-1">
                      {prod.variants.map(v => (
                        <div key={v.id} className="flex justify-between text-[11px] text-slate-600 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-950/30 px-2.5 py-1 rounded-md">
                          <span>{v.attributeName}: <strong>{v.attributeValue}</strong></span>
                          <span className="font-mono text-indigo-600 dark:text-indigo-400 font-medium">
                            +{formatINR(v.additionalPricePaise)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Action */}
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleOpenDetails(prod)}
                  className="text-xs font-semibold text-teal-700 dark:text-teal-400 hover:text-teal-800 dark:hover:text-teal-300 flex items-center gap-1 cursor-pointer"
                >
                  <span>Product Details</span>
                  <span aria-hidden="true">→</span>
                </button>
                {isAdmin && prod.status === 'active' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleArchive(prod);
                    }}
                    className="text-xs text-rose-600 hover:text-rose-700 font-semibold cursor-pointer"
                  >
                    Archive
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Product Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Create Catalog Product & Variants
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400">✕</button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Product Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. Enterprise CRM"
                    className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Product Code / SKU</label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={e => setCode(e.target.value)}
                    placeholder="e.g. BL-CRM-01"
                    className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Type</label>
                  <select
                    value={type}
                    onChange={e => setType(e.target.value as ProductType)}
                    className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                  >
                    <option>Software</option>
                    <option>Service</option>
                    <option>Add-on</option>
                    <option>Physical</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Sales Price (₹)</label>
                  <input
                    type="number"
                    required
                    value={salesRupees}
                    onChange={e => setSalesRupees(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Cost Price (₹)</label>
                  <input
                    type="number"
                    required
                    value={costRupees}
                    onChange={e => setCostRupees(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Comprehensive description of product capabilities..."
                  className="w-full h-16 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-slate-500 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-xs"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SECTION 9: Product & Variant Details Modal */}
      {selectedProduct && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedProduct(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
        >
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {selectedProduct.name}
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold">
                    {selectedProduct.code}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400 font-semibold uppercase">
                    {selectedProduct.type}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Detailed product snapshot, pricing architecture, and variant matrix
                </p>
              </div>

              <div className="flex items-center gap-2">
                {isAdmin && !isEditing && (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="px-3 py-1.5 text-xs font-semibold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 rounded-lg hover:bg-teal-100 transition-colors cursor-pointer"
                  >
                    Edit Product
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedProduct(null)}
                  className="px-2.5 py-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-lg border border-slate-200 dark:border-slate-700"
                >
                  Close (Esc)
                </button>
              </div>
            </div>

            {isEditing ? (
              <form onSubmit={handleSaveProductEdit} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Product Name</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Sales Price (INR)</label>
                    <input
                      type="number"
                      required
                      value={editSalesRupees}
                      onChange={e => setEditSalesRupees(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Cost Price (INR - Confidential)</label>
                    <input
                      type="number"
                      value={editCostRupees}
                      onChange={e => setEditCostRupees(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Description</label>
                  <textarea
                    rows={3}
                    value={editDescription}
                    onChange={e => setEditDescription(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Product Status</label>
                    <select
                      value={editStatus}
                      onChange={e => setEditStatus(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Category / Type</label>
                    <select
                      value={editType}
                      onChange={e => setEditType(e.target.value as any)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                    >
                      <option value="Software">Software</option>
                      <option value="Service">Service</option>
                      <option value="Add-on">Add-on</option>
                      <option value="Physical">Physical Terminal</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-3.5 py-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-4 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold shadow-xs disabled:opacity-50"
                  >
                    {isSaving ? 'Saving...' : 'Save Product Updates'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4 text-xs">
                {/* Description */}
                <div>
                  <span className="text-slate-400 uppercase font-semibold text-[10px] tracking-wider">Description</span>
                  <p className="text-slate-700 dark:text-slate-300 mt-1 leading-relaxed">
                    {selectedProduct.description || 'No description provided.'}
                  </p>
                </div>

                {/* Financial & Margin Matrix */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-400 text-[10px] uppercase font-semibold">Base Sales Price</span>
                    <div className="font-mono font-bold text-slate-900 dark:text-white text-base mt-0.5">
                      {formatINR(selectedProduct.salesPricePaise)}
                    </div>
                  </div>

                  {/* Section 9: Cost price visible only to authorized roles */}
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-400 text-[10px] uppercase font-semibold">Cost Price (Admin)</span>
                    <div className="font-mono font-bold text-slate-700 dark:text-slate-300 text-base mt-0.5">
                      {selectedProduct.costPricePaise ? formatINR(selectedProduct.costPricePaise) : 'Restricted'}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-400 text-[10px] uppercase font-semibold">Gross Margin</span>
                    <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-base mt-0.5">
                      {selectedProduct.salesPricePaise > 0
                        ? Math.round(((selectedProduct.salesPricePaise - selectedProduct.costPricePaise) / selectedProduct.salesPricePaise) * 100)
                        : 0}%
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-400 text-[10px] uppercase font-semibold">Availability</span>
                    <div className="font-semibold text-teal-700 dark:text-teal-400 text-sm mt-1 capitalize">
                      {selectedProduct.status}
                    </div>
                  </div>
                </div>

                {/* Variants Matrix */}
                <div>
                  <span className="text-slate-400 uppercase font-semibold text-[10px] tracking-wider">
                    Available Variants ({selectedProduct.variants.length})
                  </span>
                  <div className="mt-1.5 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
                    {selectedProduct.variants.length === 0 ? (
                      <div className="p-3 text-slate-400 text-center">No secondary variants configured.</div>
                    ) : (
                      selectedProduct.variants.map((v, i) => (
                        <div key={v.id || i} className="p-2.5 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/40">
                          <div>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">{v.attributeValue}</span>
                            <span className="text-slate-400 ml-2 font-mono text-[11px]">({v.attributeName})</span>
                            <span className="text-slate-400 ml-2 font-mono text-[10px]">SKU: {v.sku}</span>
                          </div>
                          <span className="font-mono font-bold text-teal-700 dark:text-teal-400">
                            +{formatINR(v.additionalPricePaise)}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Related Plans & Subscribers */}
                {detailedProduct && (
                  <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 uppercase font-semibold text-[10px] tracking-wider">
                        Linked Subscription Plans
                      </span>
                      <span className="font-mono text-slate-600 dark:text-slate-300 font-semibold">
                        {detailedProduct.activeSubscribersCount || 0} Active Subscribers
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {detailedProduct.relatedPlans?.map((plan: any) => (
                        <div key={plan.id} className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 flex items-center justify-between">
                          <div>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">{plan.name}</span>
                            <span className="text-slate-400 ml-2 capitalize font-mono text-[11px]">({plan.billingFrequency})</span>
                          </div>
                          <span className="font-mono font-bold text-slate-900 dark:text-white">
                            {formatINR(plan.pricePaise)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Audit & Timestamps */}
                <div className="pt-2 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span>Created: {new Date(selectedProduct.createdAt).toLocaleDateString()}</span>
                  <span>Last Updated: {new Date(selectedProduct.updatedAt).toLocaleDateString()}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
