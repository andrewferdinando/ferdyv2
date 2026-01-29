import React from 'react';

const SparkleIcon = ({ size = 12 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0L14.59 8.41L23 11L14.59 13.59L12 22L9.41 13.59L1 11L9.41 8.41L12 0Z"/>
  </svg>
);

const AutoBadge = ({ children }: { children: React.ReactNode }) => (
  <span style={{
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '9px',
    fontWeight: '600',
    color: '#7c3aed',
    background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
    padding: '2px 6px',
    borderRadius: '4px',
    border: '1px solid #e9d5ff',
    textTransform: 'uppercase',
    letterSpacing: '0.3px'
  }}>
    <SparkleIcon size={8} />
    {children}
  </span>
);

const PublishedPill = () => (
  <span style={{
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '11px',
    fontWeight: '600',
    color: '#10b981',
    background: '#ecfdf5',
    padding: '4px 10px',
    borderRadius: '12px',
    border: '1px solid #a7f3d0'
  }}>
    Published
  </span>
);

export default function FerdyPublishedPostDesktop() {
  return (
    <div style={{
      width: '100%',
      maxWidth: '780px',
      background: '#ffffff',
      borderRadius: '12px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
      border: '1px solid #e5e7eb',
      overflow: 'hidden',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
    }}>

      {/* Automation Header */}
      <div style={{
        background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
        padding: '8px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px'
      }}>
        <SparkleIcon size={12} />
        <span style={{
          fontSize: '12px',
          fontWeight: '600',
          color: 'white',
          letterSpacing: '0.2px'
        }}>
          Published on Autopilot
        </span>
        <SparkleIcon size={12} />
      </div>

      <div style={{ padding: '20px 24px' }}>
        {/* Main content row */}
        <div style={{
          display: 'flex',
          gap: '20px',
          marginBottom: '16px'
        }}>

          {/* Thumbnail */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <img
              src="/images/burger-tuesday.jpg"
              alt="Burger Tuesday"
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '8px',
                objectFit: 'cover'
              }}
            />
            {/* Auto badge on image */}
            <div style={{
              position: 'absolute',
              bottom: '-6px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'white',
              padding: '2px 6px',
              borderRadius: '4px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
              whiteSpace: 'nowrap'
            }}>
              <AutoBadge>Auto selected</AutoBadge>
            </div>
          </div>

          {/* Copy */}
          <div style={{ flex: 1 }}>
            <div style={{ marginBottom: '6px' }}>
              <AutoBadge>Auto-generated</AutoBadge>
            </div>
            <p style={{
              fontSize: '14px',
              lineHeight: '1.6',
              color: '#374151',
              margin: 0
            }}>
              Imagine savoring two delicious burgers for the price of one every Tuesday, making it the perfect opportunity for friends and family to indulge together.
            </p>
          </div>
        </div>

        {/* Platform status row */}
        <div style={{
          display: 'flex',
          gap: '16px',
          marginBottom: '16px',
          flexWrap: 'wrap'
        }}>

          {/* Facebook */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: '#1877f2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative'
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              <div style={{
                position: 'absolute',
                bottom: '-2px',
                right: '-2px',
                width: '14px',
                height: '14px',
                borderRadius: '50%',
                background: '#10b981',
                border: '2px solid white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
            </div>
            <div>
              <div style={{
                fontSize: '13px',
                fontWeight: '500',
                color: '#111827'
              }}>Facebook</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <PublishedPill />
                <span style={{
                  fontSize: '12px',
                  color: '#3b82f6',
                  cursor: 'pointer'
                }}>View post</span>
              </div>
            </div>
          </div>

          {/* Instagram Feed */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative'
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
              <div style={{
                position: 'absolute',
                bottom: '-2px',
                right: '-2px',
                width: '14px',
                height: '14px',
                borderRadius: '50%',
                background: '#10b981',
                border: '2px solid white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
            </div>
            <div>
              <div style={{
                fontSize: '13px',
                fontWeight: '500',
                color: '#111827'
              }}>Instagram Feed</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <PublishedPill />
                <span style={{
                  fontSize: '12px',
                  color: '#3b82f6',
                  cursor: 'pointer'
                }}>View post</span>
              </div>
            </div>
          </div>

          {/* Instagram Story */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'linear-gradient(45deg, #833ab4 0%, #fd1d1d 50%, #fcb045 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative'
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
              <div style={{
                position: 'absolute',
                bottom: '-2px',
                right: '-2px',
                width: '14px',
                height: '14px',
                borderRadius: '50%',
                background: '#10b981',
                border: '2px solid white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
            </div>
            <div>
              <div style={{
                fontSize: '13px',
                fontWeight: '500',
                color: '#111827'
              }}>Instagram Story</div>
              <PublishedPill />
            </div>
          </div>
        </div>

        {/* Divider */}
        <div style={{
          height: '1px',
          background: '#e5e7eb',
          marginBottom: '16px'
        }} />

        {/* Bottom row: Date/time and schedule tag */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}>

          {/* Published date */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            <span style={{
              fontSize: '13px',
              color: '#6b7280',
              fontWeight: '500'
            }}>
              Published &bull; Feb 2, 2026, 6:00 PM
            </span>
            <AutoBadge>Scheduled</AutoBadge>
          </div>

          {/* Schedule tag */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: '#fef3c7',
              padding: '6px 12px',
              borderRadius: '6px'
            }}>
              <span style={{
                fontSize: '13px',
                fontWeight: '600',
                color: '#92400e'
              }}>Burger Tuesday</span>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: '#6b7280',
              fontSize: '13px'
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              <span>Weekly (Mon at 18:00)</span>
              <AutoBadge>Auto publish</AutoBadge>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
