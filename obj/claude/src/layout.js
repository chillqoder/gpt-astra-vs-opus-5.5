// Real-world dimensions of the machine, in metres. Origin is the floor, centred
// under the cabinet; +Z is the front face, +Y is up.

export const W = 1.0;            // cabinet width
export const D = 0.70;           // cabinet depth
export const BASE_Y = 0.08;      // underside of the cabinet (plinth + feet below)
export const TOP_Y = 1.80;       // top of the cabinet
export const FRONT_Z = 0.35;     // flat front face of the door
export const BACK_Z = -0.35;     // back face
export const SPLIT_Z = 0.025;    // seam between the rear shell and the door

// Door (front section) extrusion
export const DOOR = {
  x0: -0.49, x1: 0.49, y0: BASE_Y + 0.01, y1: TOP_Y - 0.01,
  zBack: 0.03, bevel: 0.01, corner: 0.02,
};

// Openings cut through the door
export const WIN = { x0: -0.45, x1: 0.21, y0: 0.74, y1: 1.555 };
export const HEADER = { x0: -0.45, x1: 0.45, y0: 1.605, y1: 1.765 };
export const BAY = { x0: -0.40, x1: 0.12, y0: 0.16, y1: 0.40 };

// Control column (raised panel on the right)
export const PANEL = { x0: 0.26, x1: 0.465, y0: 0.56, y1: 1.555, depth: 0.014 };
export const PANEL_FRONT = FRONT_Z + PANEL.depth;
export const PANEL_CX = (PANEL.x0 + PANEL.x1) / 2;

// Display window grid
export const ROWS = 3;
export const COLS = 6;
export const ROW_H = (WIN.y1 - WIN.y0) / ROWS;   // ≈ 0.272
export const STRIP_H = 0.045;                    // button strip under each row
export const GLASS_H = ROW_H - STRIP_H;          // visible glass band per row
export const COL_W = (WIN.x1 - WIN.x0) / COLS;   // ≈ 0.11
export const CAVITY_BACK_Z = 0.06;               // back wall of the display cavity
export const GLASS_Z = 0.345;
export const STRIP_FRONT_Z = 0.362;

export const rowTop = (r) => WIN.y1 - r * ROW_H;
export const shelfY = (r) => rowTop(r) - GLASS_H;
export const colX = (c) => WIN.x0 + COL_W * (c + 0.5);

// Seams on the door face
export const SEAM_X = 0.245;     // vertical line left of the control column
export const SEAM_Y = 0.70;      // horizontal split below the window
export const STRIPE_Y = 0.62;    // decorative stripe running around the body
