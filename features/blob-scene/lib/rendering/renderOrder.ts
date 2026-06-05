/** Back → front draw order for sketch hover stack. */
export const RENDER_SPHERE = 0;
/** Debug overlay for camera-facing pickable live vertices. */
export const RENDER_DEBUG_PICKABLE = 1;
export const RENDER_PARTNER_SPHERE = 2;
export const RENDER_PARTNER_ORBIT = 3;
/** Option 2 S1 curator logos in orbit around the blob. */
export const RENDER_SATELLITE_LOGO = 4;
export const RENDER_PLEXUS_LINES = 10;
/** Must stay well above lines so PNG draws last in the transparent pass. */
export const RENDER_HUB_LOGO = 10000;
