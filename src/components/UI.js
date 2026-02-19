/**
 * components/UI.js
 * Centralized, state-driven UI components for AOPRISM.
 * Employs premium aesthetics and accessibility.
 */

export const UI = {
    /**
     * Returns a standard loading spinner
     */
    spinner: (size = '24px', color = 'var(--primary)') => `
    <div class="loading-spinner" style="width: ${size}; height: ${size}; border: 3px solid rgba(255,255,255,0.1); border-top: 3px solid ${color}; border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
    <style>
      @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    </style>
  `,

    /**
     * Returns a full-page loading overlay
     */
    loadingOverlay: (message = 'Processing...') => `
    <div id="global-loading" class="fade-in" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); backdrop-filter: blur(4px); display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 9999; gap: 16px;">
        ${UI.spinner('48px')}
        <div style="font-size: 1rem; font-weight: 500; color: white; letter-spacing: 1px;">${message}</div>
    </div>
  `,

    /**
     * Returns an error banner
     */
    errorBanner: (message) => `
    <div class="error-banner fade-in" style="background: rgba(239, 68, 68, 0.1); border: 1px solid var(--danger); color: var(--danger); padding: 12px 16px; border-radius: 8px; margin-bottom: 20px; display: flex; align-items: center; gap: 12px;">
        <span style="font-size: 1.2rem;">🚫</span>
        <div style="font-size: 0.9rem; font-weight: 500;">${message}</div>
    </div>
  `,

    /**
     * Returns an empty state placeholder
     */
    emptyState: (message, icon = '󰈙') => `
    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px; color: var(--text-muted); gap: 12px;">
        <span style="font-size: 3rem; opacity: 0.3;">${icon}</span>
        <p style="font-size: 0.95rem;">${message}</p>
    </div>
  `
}
