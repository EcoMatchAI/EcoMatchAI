import React, { useState } from 'react';
import { ArrowLeft, Plus, Pencil, Share2, X, Copy, MessageCircle } from 'lucide-react';
import Sidebar from '../common/Sidebar';
import Topnav from '../common/Topnav';
import Footer from '../common/Footer';
import avatarImg from '../../assets/avatar.png';

import coffeeImg from '../../assets/coffee_grounds.png';
import fabricImg from '../../assets/fabric_waste.png';
import woodImg from '../../assets/wood_offcuts.png';
import packagingImg from '../../assets/paper_packaging.png';

const LISTINGS_DATA = [
  {
    id: 'coffee',
    title: 'USED COFFEE GROUNDS - High Purity - Daily Supply.',
    shortTitle: 'Used Coffee Grounds',
    qty: '120kg/week',
    source: 'Pune Cafe',
    logistics: 'Local Pickup Recommended',
    img: coffeeImg,
    gallery: [coffeeImg, fabricImg, woodImg, packagingImg, coffeeImg],
    desc: 'Freshly extracted in used coffee grounds - mpt, high protein quality - materials tinied, dried - wood, packaged, consumer father and lonest, coffee.',
    matchScore: '95%',
    matchPartner: 'BioSkins Skincare Co.',
    matchWhy: 'Distance (5km), Purity (92%), Volume Match (Excellent)',
    latLngStart: { x: 60, y: 55 },
    latLngEnd: { x: 140, y: 120 }
  },
  {
    id: 'fabric',
    title: 'RECYCLED TEXTILE FABRIC - Assorted Colors & Materials.',
    shortTitle: 'Recycled Textile Fabric',
    qty: '350kg/month',
    source: 'Textiles Co.',
    logistics: 'Freight Delivery arranged by Supplier',
    img: fabricImg,
    gallery: [fabricImg, coffeeImg, woodImg, packagingImg, fabricImg],
    desc: 'Clean, sorted fabric scraps from clothing manufacturing. Mixed cotton and polyester blends, suitable for insulation, upcycling, or rag production.',
    matchScore: '88%',
    matchPartner: 'EcoInsulate Ltd.',
    matchWhy: 'Purity (85%), Distance (12km), Regular Supply (High)',
    latLngStart: { x: 80, y: 40 },
    latLngEnd: { x: 120, y: 150 }
  },
  {
    id: 'wood',
    title: 'PREMIUM WOOD OFFCUTS - Hardwood & Softwood Mix.',
    shortTitle: 'Premium Wood Offcuts',
    qty: '500kg/month',
    source: 'Pune Carpenter',
    logistics: 'Self-organized transport or carrier pickup',
    img: woodImg,
    gallery: [woodImg, coffeeImg, fabricImg, packagingImg, woodImg],
    desc: 'Assorted pine, oak, and plywood offcuts from furniture production. Untreated, clean wood offcuts, perfect for wood crafts, pellet production, or biomass.',
    matchScore: '92%',
    matchPartner: 'Artisan Toys Inc.',
    matchWhy: 'Material Match (100%), Distance (8km), Consistent Volume',
    latLngStart: { x: 110, y: 70 },
    latLngEnd: { x: 90, y: 130 }
  },
  {
    id: 'grain',
    title: 'SPENT BREWERY GRAIN - High Protein Feed Quality.',
    shortTitle: 'Spent Brewery Grain',
    qty: '800kg/week',
    source: 'Pune Brewpub',
    logistics: 'Immediate pickup required post-brew (Thursdays)',
    img: packagingImg,
    gallery: [packagingImg, coffeeImg, fabricImg, woodImg, packagingImg],
    desc: 'Wet spent barley grains from craft brewing process. High moisture and protein content. Ideal for livestock feed, compost, or food product upcycling.',
    matchScore: '94%',
    matchPartner: 'GreenFeed Farms',
    matchWhy: 'Moisture requirements met, Distance (15km), Volume matched',
    latLngStart: { x: 40, y: 90 },
    latLngEnd: { x: 160, y: 110 }
  }
];

const SHARE_CONTACTS = [
  { id: 'greenbrew', name: 'GreenBrew Co.' },
  { id: 'biopack', name: 'BioPack Solutions' },
  { id: 'ecoinsulate', name: 'EcoInsulate Ltd.' },
  { id: 'artisan', name: 'Artisan Toys Inc.' },
];

export const ListingsDetailsPage = ({ currentPage, setCurrentPage, triggerToast, setListingDraft }) => {
  const [selectedListingId, setSelectedListingId] = useState(null);
  const [shareOpen, setShareOpen] = useState(false);

  const startCreate = () => {
    setListingDraft?.(null);
    setCurrentPage('createListing');
  };

  const startEdit = (item) => {
    setListingDraft?.({ title: item.title, city: item.source, logistics: item.logistics });
    setCurrentPage('createListing');
  };

  const activeListing = LISTINGS_DATA.find(item => item.id === selectedListingId);

  const shareToContact = (contact) => {
    setShareOpen(false);
    triggerToast(`"${activeListing.shortTitle}" shared with ${contact.name} in your inbox.`);
    setCurrentPage('messages');
  };

  const shareVia = (platform) => {
    setShareOpen(false);
    if (platform === 'Copy link') {
      triggerToast('Listing link copied to clipboard!');
    } else {
      triggerToast(`Sharing "${activeListing.shortTitle}" via ${platform}...`);
    }
  };

  return (
    <div className="inbox-page-wrapper">
      <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} triggerToast={triggerToast} />
      <main className="inbox-main-content">
        <Topnav triggerToast={triggerToast} setCurrentPage={setCurrentPage} />

        <div className="inbox-view-container" style={{ overflowY: 'auto' }}>
          
          {!activeListing ? (
            // LISTINGS GRID VIEW (No listing selected)
            <div>
              <div className="details-back-header" onClick={() => setCurrentPage('listsource')}>
                <ArrowLeft size={18} />
                <span>Back to Home</span>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', gap: '12px', flexWrap: 'wrap' }}>
                <h1 className="inbox-view-title" style={{ margin: 0 }}>My Active Symbiosis Listings</h1>
                <button className="dash-primary-btn" onClick={startCreate}>
                  <Plus size={18} />
                  Create Listing
                </button>
              </div>

              <div className="listings-grid">
                {LISTINGS_DATA.map(item => (
                  <div
                    key={item.id}
                    className="listing-item-card cursor-pointer"
                    onClick={() => setSelectedListingId(item.id)}
                  >
                    <div className="card-top-header">
                      <img src={item.img} alt={item.shortTitle} className="card-thumb-img" />
                      <div>
                        <h3 className="card-top-title">{item.shortTitle}</h3>
                        <span style={{ fontSize: '12.5px', color: '#6B7280', fontWeight: '600' }}>{item.source}</span>
                      </div>
                    </div>

                    <div className="card-meta-row">
                      <div className="card-meta-item">
                        <span>Quantity:</span>
                        <span className="card-meta-right-val">{item.qty}</span>
                      </div>
                      <div className="card-meta-item">
                        <span>Logistics:</span>
                        <span className="card-meta-right-val" style={{ fontSize: '11px', textAlign: 'right' }}>
                          {item.logistics}
                        </span>
                      </div>
                    </div>

                    <div className="card-btn-group" style={{ marginTop: '8px' }}>
                      <button className="btn-card-details" onClick={(e) => { e.stopPropagation(); setSelectedListingId(item.id); }}>
                        View Details
                      </button>
                      <button className="btn-card-source" onClick={(e) => { e.stopPropagation(); startEdit(item); }}>
                        Edit
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            // DETAILED VIEW FOR SELECTED ITEM
            <div>
              <div 
                className="details-back-header"
                onClick={() => setSelectedListingId(null)}
              >
                <ArrowLeft size={18} />
                <span>Back to Listings Selection</span>
              </div>

              <div className="details-grid">
                
                {/* Left Card */}
                <div className="details-main-card">
                  <h1 className="details-main-title">{activeListing.title}</h1>
                  
                  <div className="details-image-gallery">
                    {activeListing.gallery.map((imgSrc, i) => (
                      <img 
                        key={i} 
                        src={imgSrc} 
                        alt={`${activeListing.shortTitle} gallery ${i + 1}`} 
                        className="details-gallery-img" 
                      />
                    ))}
                  </div>

                  <div className="details-section">
                    <span className="details-section-title">Material Description</span>
                    <p className="details-section-desc">
                      {activeListing.desc}
                    </p>
                  </div>

                  <div className="details-section">
                    <span className="details-section-title">Quantity</span>
                    <span className="details-section-val">{activeListing.qty}</span>
                  </div>

                  <div className="details-section">
                    <span className="details-section-title">Source</span>
                    <span className="details-section-val">{activeListing.source}</span>
                  </div>

                  <div className="details-section">
                    <span className="details-section-title">Logistics</span>
                    <span className="details-section-val">{activeListing.logistics}</span>
                  </div>
                </div>

                {/* Right Card / Sidebar — Manage Listing */}
                <div className="details-sidebar-col">
                  <div className="manage-listing-card">
                    <h2 className="manage-listing-title">Manage Listing</h2>
                    <p className="manage-listing-sub">
                      Update your listing details, or share it with a contact and across your channels.
                    </p>

                    <div className="manage-listing-btns">
                      <button className="btn-edit-details" onClick={() => startEdit(activeListing)}>
                        <Pencil size={16} /> Edit Details
                      </button>
                      <button className="btn-share-listing" onClick={() => setShareOpen(true)}>
                        <Share2 size={16} /> Share
                      </button>
                    </div>

                    <div className="manage-listing-meta">
                      <div className="manage-meta-row">
                        <span>Status</span>
                        <span className="listing-status-badge status-active">Active</span>
                      </div>
                      <div className="manage-meta-row">
                        <span>Quantity</span>
                        <strong>{activeListing.qty}</strong>
                      </div>
                      <div className="manage-meta-row">
                        <span>Source</span>
                        <strong>{activeListing.source}</strong>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

        </div>
        <Footer variant="compact" triggerToast={triggerToast} setCurrentPage={setCurrentPage} />
      </main>

      {/* Share Listing Modal */}
      {shareOpen && activeListing && (
        <div className="share-overlay" onClick={() => setShareOpen(false)}>
          <div className="share-modal" onClick={(e) => e.stopPropagation()}>
            <div className="share-modal-header">
              <div>
                <h3 className="share-modal-title">Share Listing</h3>
                <p className="share-modal-sub">{activeListing.shortTitle}</p>
              </div>
              <button className="share-close-btn" aria-label="Close" onClick={() => setShareOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="share-section-label">Send to a contact</div>
            <div className="share-contacts">
              {SHARE_CONTACTS.map((c) => (
                <button key={c.id} className="share-contact" onClick={() => shareToContact(c)}>
                  <img src={avatarImg} alt={c.name} className="share-contact-avatar" />
                  <span className="share-contact-name">{c.name}</span>
                </button>
              ))}
            </div>

            <div className="share-section-label">Share via</div>
            <div className="share-socials">
              <button className="share-social whatsapp" onClick={() => shareVia('WhatsApp')}>
                <MessageCircle size={18} /> WhatsApp
              </button>
              <button className="share-social x" onClick={() => shareVia('X')}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z"/></svg>
                X
              </button>
              <button className="share-social instagram" onClick={() => shareVia('Instagram')}>
                <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                Instagram
              </button>
              <button className="share-social linkedin" onClick={() => shareVia('LinkedIn')}>
                <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.779-1.75-1.75s.784-1.75 1.75-1.75 1.75.779 1.75 1.75-.784 1.75-1.75 1.75zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                LinkedIn
              </button>
              <button className="share-social copy" onClick={() => shareVia('Copy link')}>
                <Copy size={17} /> Copy link
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default ListingsDetailsPage;
