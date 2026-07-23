import React, { useState } from 'react';
import {
  Box, Recycle, MapPin, Menu, X, SlidersHorizontal,
  Calendar, Droplet, Tag, Clock, Layers, Package, Truck,
  Building2, FileText, BadgeCheck, IndianRupee
} from 'lucide-react';
import Sidebar from '../common/Sidebar';
import Topnav from '../common/Topnav';
import Footer from '../common/Footer';

import coffeeImg from '../../assets/coffee_grounds.png';
import fabricImg from '../../assets/fabric_waste.png';
import woodImg from '../../assets/wood_offcuts.png';

/* ----------------------------------------------------------------------------
   Marketplace Listings — full core listing fields per product
   ---------------------------------------------------------------------------- */
const LISTINGS = [
  {
    id: 1,
    title: '120kg Spent Coffee Grounds — Daily Supply',
    category: 'Organic',
    description: 'Freshly extracted spent coffee grounds from a high-volume cafe. Collected daily, high in nitrogen and antioxidants. Ideal for skincare extraction, biofuel, or compost.',
    img: coffeeImg,
    gallery: [coffeeImg, woodImg, fabricImg],
    quantity: '120 kg',
    frequency: 'Daily',
    availability: 'Available from Wed, 14 Aug',
    purity: '92% (high)',
    moisture: 'Wet (~60%)',
    price: '₹8 / kg',
    pricingModel: 'Negotiable',
    location: 'Koregaon Park, Pune',
    logistics: 'Local Pickup',
    packaging: 'Bagged (25kg sacks)',
    source: 'GreenBrew Co.',
    verified: true,
    certifications: 'Food-grade handling certificate',
    status: 'Active',
    score: 94,
  },
  {
    id: 2,
    title: '350kg Recycled Textile Fabric — Assorted',
    category: 'Textiles',
    description: 'Clean, sorted fabric scraps from clothing manufacturing. Mixed cotton/polyester blends suitable for insulation, upcycling, or rag production.',
    img: fabricImg,
    gallery: [fabricImg, coffeeImg, woodImg],
    quantity: '350 kg',
    frequency: 'Monthly',
    availability: 'Available now',
    purity: '85% (Grade B)',
    moisture: 'Dry',
    price: '₹15 / kg',
    pricingModel: 'Fixed',
    location: 'Hadapsar, Pune',
    logistics: 'Freight (supplier-arranged)',
    packaging: 'Palletised',
    source: 'Pune Textiles Guild',
    verified: true,
    certifications: 'OEKO-TEX material report',
    status: 'Active',
    score: 88,
  },
  {
    id: 3,
    title: '500kg Premium Wood Offcuts — Hardwood Mix',
    category: 'Wood',
    description: 'Assorted pine, oak, and plywood offcuts from furniture production. Untreated and clean — perfect for wood crafts, pellet production, or biomass.',
    img: woodImg,
    gallery: [woodImg, fabricImg, coffeeImg],
    quantity: '500 kg',
    frequency: 'Monthly',
    availability: 'Available from Mon, 19 Aug',
    purity: 'Grade A (untreated)',
    moisture: 'Dry (kiln)',
    price: 'Free — disposal saving',
    pricingModel: 'Free',
    location: 'Bhosari MIDC, Pune',
    logistics: 'Buyer-arranged',
    packaging: 'Loose / bulk',
    source: 'Apex Woodworks',
    verified: false,
    certifications: '—',
    status: 'Active',
    score: 92,
  },
  {
    id: 4,
    title: '800kg Spent Brewery Grain — Feed Quality',
    category: 'Organic',
    description: 'Wet spent barley grains from craft brewing. High moisture and protein content — ideal for livestock feed, compost, or food upcycling.',
    img: coffeeImg,
    gallery: [coffeeImg, woodImg, fabricImg],
    quantity: '800 kg',
    frequency: 'Weekly',
    availability: 'Pickup Thursdays',
    purity: '90% (high protein)',
    moisture: 'Wet (~75%)',
    price: '₹5 / kg',
    pricingModel: 'Negotiable',
    location: 'Viman Nagar, Pune',
    logistics: 'Local Pickup',
    packaging: 'Bulk container',
    source: 'GreenBrew Co.',
    verified: true,
    certifications: 'Feed-safety lab report',
    status: 'Reserved',
    score: 90,
  },
  {
    id: 5,
    title: '200kg Mixed PET Plastic Scraps',
    category: 'Plastics',
    description: 'Clean post-industrial PET scraps from packaging line. Sorted by colour, low contamination — suitable for re-pelletising and fibre production.',
    img: fabricImg,
    gallery: [fabricImg, coffeeImg, woodImg],
    quantity: '200 kg',
    frequency: 'Weekly',
    availability: 'Available now',
    purity: '95% (Grade A)',
    moisture: 'Dry',
    price: '₹22 / kg',
    pricingModel: 'Fixed',
    location: 'Chakan, Pune',
    logistics: 'Courier',
    packaging: 'Bagged',
    source: 'CleanPoly Ltd',
    verified: true,
    certifications: 'Polymer purity certificate',
    status: 'Active',
    score: 86,
  },
  {
    id: 6,
    title: '1.2T Steel Turnings & Metal Offcuts',
    category: 'Metals',
    description: 'Mild-steel machining turnings and offcuts from a fabrication unit. Oil-free and segregated — ready for re-melting or scrap recovery.',
    img: woodImg,
    gallery: [woodImg, fabricImg, coffeeImg],
    quantity: '1,200 kg',
    frequency: 'Monthly',
    availability: 'Available from Fri, 23 Aug',
    purity: 'Grade A (segregated)',
    moisture: 'Dry',
    price: '₹40 / kg',
    pricingModel: 'Negotiable',
    location: 'Pimpri, Pune',
    logistics: 'Freight (supplier-arranged)',
    packaging: 'Palletised',
    source: 'IronWorks Fabrication',
    verified: true,
    certifications: 'Material composition report',
    status: 'Active',
    score: 83,
  },
];

const STATUS_STYLES = {
  Active: 'status-active',
  Reserved: 'status-reserved',
  Paused: 'status-paused',
  Completed: 'status-completed',
  Expired: 'status-expired',
};

export const MarketplacePage = ({ currentPage, setCurrentPage, triggerToast }) => {
  // Marketplace Filter States
  const [filterRadius, setFilterRadius] = useState('25km');
  const [filterOrganic, setFilterOrganic] = useState(false);
  const [filterTextiles, setFilterTextiles] = useState(false);
  const [filterWood, setFilterWood] = useState(false);
  const [filterPlastics, setFilterPlastics] = useState(false);
  const [filterMetals, setFilterMetals] = useState(false);
  const [filterPurity, setFilterPurity] = useState(true);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  // Selected product for the detail modal
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [activeImage, setActiveImage] = useState(0);

  const openProduct = (item) => {
    setSelectedProduct(item);
    setActiveImage(0);
  };
  const closeProduct = () => setSelectedProduct(null);

  const categoryIcon = (cat) =>
    cat === 'Organic' ? <Box size={14} /> : cat === 'Metals' ? <Layers size={14} /> : <Recycle size={14} />;

  const detailFields = (p) => [
    { icon: <Tag size={15} />, label: 'Material Category', value: p.category },
    { icon: <Box size={15} />, label: 'Quantity', value: p.quantity },
    { icon: <Clock size={15} />, label: 'Frequency', value: p.frequency },
    { icon: <Calendar size={15} />, label: 'Availability', value: p.availability },
    { icon: <BadgeCheck size={15} />, label: 'Purity / Grade', value: p.purity },
    { icon: <Droplet size={15} />, label: 'Moisture / Condition', value: p.moisture },
    { icon: <IndianRupee size={15} />, label: 'Price', value: p.price },
    { icon: <Tag size={15} />, label: 'Pricing Model', value: p.pricingModel },
    { icon: <MapPin size={15} />, label: 'Location', value: p.location },
    { icon: <Truck size={15} />, label: 'Logistics Term', value: p.logistics },
    { icon: <Package size={15} />, label: 'Packaging', value: p.packaging },
    { icon: <FileText size={15} />, label: 'Certifications', value: p.certifications },
  ];

  return (
    <div className="inbox-page-wrapper">
      <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} triggerToast={triggerToast} />

      {/* Backdrop overlay */}
      {isFiltersOpen && (
        <div className="filters-backdrop" onClick={() => setIsFiltersOpen(false)} />
      )}

      <main className="inbox-main-content">
        <Topnav triggerToast={triggerToast} setCurrentPage={setCurrentPage} />

        <div className="inbox-view-container" style={{ display: 'flex', flexDirection: 'column' }}>

          <div className="marketplace-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h1 className="inbox-view-title" style={{ margin: 0 }}>Waste Marketplace</h1>
            <button
              className="top-filter-button"
              onClick={() => setIsFiltersOpen(!isFiltersOpen)}
              title="Toggle Filters"
            >
              <Menu size={18} />
              <span>Filters</span>
            </button>
          </div>

          <div className="marketplace-layout">
            {/* Left filters panel */}
            <aside className={`filters-sidebar ${isFiltersOpen ? 'open' : ''}`}>
              {/* Drawer Header */}
              <div className="drawer-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', paddingBottom: '12px', borderBottom: '1px solid #F3F4F6' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <SlidersHorizontal size={18} style={{ color: '#10B981' }} />
                  <span style={{ fontSize: '16px', fontWeight: '800', color: '#111827' }}>Filter Materials</span>
                </div>
                <button
                  onClick={() => setIsFiltersOpen(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Category Filter */}
              <div className="filter-group">
                <span className="filter-title">Category</span>

                <label className="filter-option">
                  <input type="checkbox" className="filter-checkbox" checked={filterOrganic} onChange={(e) => setFilterOrganic(e.target.checked)} />
                  Organic
                </label>
                <label className="filter-option">
                  <input type="checkbox" className="filter-checkbox" checked={filterTextiles} onChange={(e) => setFilterTextiles(e.target.checked)} />
                  Textiles
                </label>
                <label className="filter-option">
                  <input type="checkbox" className="filter-checkbox" checked={filterWood} onChange={(e) => setFilterWood(e.target.checked)} />
                  Wood
                </label>
                <label className="filter-option">
                  <input type="checkbox" className="filter-checkbox" checked={filterPlastics} onChange={(e) => setFilterPlastics(e.target.checked)} />
                  Plastics
                </label>
                <label className="filter-option">
                  <input type="checkbox" className="filter-checkbox" checked={filterMetals} onChange={(e) => setFilterMetals(e.target.checked)} />
                  Metals
                </label>
              </div>

              {/* Radius Filter */}
              <div className="filter-group">
                <span className="filter-title">Radius</span>
                <label className="filter-option">
                  <input type="radio" name="radius" className="filter-radio" checked={filterRadius === '25km'} onChange={() => setFilterRadius('25km')} />
                  25km
                </label>
                <label className="filter-option">
                  <input type="radio" name="radius" className="filter-radio" checked={filterRadius === '50km'} onChange={() => setFilterRadius('50km')} />
                  50km
                </label>
                <label className="filter-option">
                  <input type="radio" name="radius" className="filter-radio" checked={filterRadius === '100km+'} onChange={() => setFilterRadius('100km+')} />
                  100km+
                </label>
              </div>

              {/* Quantity Filter */}
              <div className="filter-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span className="filter-title">Quantity</span>
                  <span className="filter-sublabel" style={{ fontWeight: 705 }}>kg/week</span>
                </div>
                <div className="qty-slider-container">
                  <div className="slider-rail">
                    <div className="slider-track"></div>
                    <div className="slider-handle"></div>
                  </div>
                  <div className="slider-labels">
                    <span>0</span>
                    <span>12,000</span>
                  </div>
                </div>
              </div>

              {/* Purity Filter */}
              <div className="filter-group">
                <span className="filter-title">Purity</span>
                <label className="filter-option">
                  <input type="checkbox" className="filter-checkbox" checked={filterPurity} onChange={(e) => setFilterPurity(e.target.checked)} />
                  90%+
                </label>
                <label className="filter-option">
                  <input type="checkbox" className="filter-checkbox" defaultChecked={false} />
                  80%+
                </label>
              </div>

              {/* Availability Date dropdown */}
              <div className="filter-group">
                <span className="filter-title">Availability Date</span>
                <select className="availability-select" defaultValue="Wed Aug" onChange={() => triggerToast('Availability filter changed')}>
                  <option value="Wed Aug">Wed Aug</option>
                  <option value="Sep">Sep</option>
                  <option value="Oct">Oct</option>
                </select>
              </div>
            </aside>

            {/* Right Listings Grid */}
            <div className="listings-grid-scroll">
              <div className="listings-grid">
                {LISTINGS.map((item) => (
                  <div
                    key={item.id}
                    className="listing-item-card cursor-pointer"
                    onClick={() => openProduct(item)}
                  >
                    <div className="card-top-header">
                      <img src={item.img} alt={item.title} className="card-thumb-img" />
                      <span className="card-top-title">{item.title}</span>
                    </div>

                    <div className="card-meta-row">
                      <div className="card-meta-item">
                        <span style={{ fontSize: '11px', color: '#6B7280', fontWeight: 800 }}>Material Type</span>
                        <span className="card-meta-right-val" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11.5px', color: '#374151' }}>
                          {categoryIcon(item.category)}
                          {item.category}
                        </span>
                      </div>

                      <div className="card-meta-item">
                        <MapPin size={12} />
                        <span>{item.location.split(',').pop().trim()}</span>
                        <span className="card-meta-right-val" style={{ fontSize: '11.5px', color: '#374151' }}>{item.quantity}</span>
                      </div>
                    </div>

                    <div className="card-score-row">
                      <div className="circular-score-wrapper" style={{ width: '36px', height: '36px' }}>
                        <svg className="circular-score-svg" viewBox="0 0 36 36">
                          <path className="circular-score-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                          <path className="circular-score-bar" strokeDasharray={`${item.score}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                        </svg>
                        <span className="circular-score-text" style={{ fontSize: '10.5px' }}>{item.score}%</span>
                      </div>
                      <span className="card-score-label">Compatibility Score</span>
                      <span className={`listing-status-badge ${STATUS_STYLES[item.status]}`} style={{ marginLeft: 'auto' }}>{item.status}</span>
                    </div>

                    <div className="card-btn-group">
                      <button
                        className="btn-card-details"
                        onClick={(e) => { e.stopPropagation(); openProduct(item); }}
                      >
                        View Details
                      </button>
                      <button
                        className="btn-card-source"
                        onClick={(e) => { e.stopPropagation(); triggerToast(`Sourcing request sent for "${item.title}"!`); }}
                      >
                        Request to Source
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
        <Footer variant="compact" triggerToast={triggerToast} setCurrentPage={setCurrentPage} />
      </main>

      {/* ====================================================================
         PRODUCT DETAIL MODAL — full core listing fields
         ==================================================================== */}
      {selectedProduct && (
        <div className="product-modal-overlay" onClick={closeProduct}>
          <div className="product-modal" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="product-modal-header">
              <div className="product-modal-heading">
                <span className={`listing-status-badge ${STATUS_STYLES[selectedProduct.status]}`}>{selectedProduct.status}</span>
                <h2 className="product-modal-title">{selectedProduct.title}</h2>
              </div>
              <button className="product-modal-close" aria-label="Close" onClick={closeProduct}>
                <X size={20} />
              </button>
            </div>

            <div className="product-modal-body">
              {/* Left: gallery */}
              <div className="product-modal-media">
                <img src={selectedProduct.gallery[activeImage]} alt={selectedProduct.title} className="product-modal-main-img" />
                <div className="product-modal-thumbs">
                  {selectedProduct.gallery.map((src, i) => (
                    <button
                      key={i}
                      className={`product-modal-thumb ${i === activeImage ? 'active' : ''}`}
                      onClick={() => setActiveImage(i)}
                    >
                      <img src={src} alt={`view ${i + 1}`} />
                    </button>
                  ))}
                </div>

                {/* Source business */}
                <div className="product-source-card">
                  <div className="product-source-icon">
                    <Building2 size={18} />
                  </div>
                  <div className="product-source-info">
                    <span className="product-source-name">
                      {selectedProduct.source}
                      {selectedProduct.verified && <BadgeCheck size={15} className="product-verified-badge" />}
                    </span>
                    <span className="product-source-sub">
                      {selectedProduct.verified ? 'Verified business' : 'Unverified — pending KYB'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right: details */}
              <div className="product-modal-details">
                {/* Compatibility score */}
                <div className="product-score-row">
                  <div className="circular-score-wrapper" style={{ width: '44px', height: '44px' }}>
                    <svg className="circular-score-svg" viewBox="0 0 36 36">
                      <path className="circular-score-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                      <path className="circular-score-bar" strokeDasharray={`${selectedProduct.score}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    </svg>
                    <span className="circular-score-text" style={{ fontSize: '11px' }}>{selectedProduct.score}%</span>
                  </div>
                  <div>
                    <span className="product-score-title">Compatibility Score</span>
                    <span className="product-score-sub">Based on material, purity, volume & distance</span>
                  </div>
                </div>

                {/* Description */}
                <div className="product-desc-block">
                  <span className="product-block-label">Description</span>
                  <p className="product-desc-text">{selectedProduct.description}</p>
                </div>

                {/* Field grid */}
                <div className="product-fields-grid">
                  {detailFields(selectedProduct).map((f, i) => (
                    <div key={i} className="product-field">
                      <span className="product-field-label">{f.icon}{f.label}</span>
                      <span className="product-field-value">{f.value}</span>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="product-modal-actions">
                  <button
                    className="btn-card-source"
                    onClick={() => { triggerToast(`Sourcing request sent for "${selectedProduct.title}"!`); closeProduct(); }}
                  >
                    Request to Source
                  </button>
                  <button
                    className="btn-card-details"
                    onClick={() => { closeProduct(); setCurrentPage('messages'); }}
                  >
                    Message Seller
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default MarketplacePage;
