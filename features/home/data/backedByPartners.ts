export type BackedByPartner = {
  src: string;
  alt: string;
  logoKey: string;
};

function partner(filename: string, alt: string, logoKey?: string): BackedByPartner {
  return {
    src: `/logos-marquee/${encodeURIComponent(filename)}`,
    alt,
    logoKey:
      logoKey ??
      alt
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, ""),
  };
}

export const backedByRow1: BackedByPartner[] = [
  partner("SIG.png", "SIG", "sig"),
  partner("Amber.png", "Amber"),
  partner("Archimed.png", "Archimed Capital"),
  partner("AUROS.png", "Auros"),
  partner("Frame 2147238830.png", "Bodhi Ventures", "bodhi"),
  partner("ChorusOne.png", "Chorus One"),
  partner("Consnsys.png", "Consensys", "consensys"),
  partner("FalconX.png", "FalconX"),
  partner("Frame 2147238834.png", "Fasanara", "fasanara"),
  partner("Figment.png", "Figment"),
  partner("Flowdesk.png", "Flowdesk"),
  partner("Fratchis.png", "Frachtis", "frachtis"),
];

export const backedByRow2: BackedByPartner[] = [
  partner("Game.png", "Gami Capital", "gami"),
  partner("GSR.png", "GSR"),
  partner("L2iv.png", "L2 Iterative Ventures", "l2iv"),
  partner("Laser.png", "Laser Digital", "laser"),
  partner("Moonhill.png", "Moonhill Capital", "moonhill"),
  partner("North.png", "North Rock Digital", "north"),
  partner("re7.png", "Re7 Capital", "re7"),
  partner("Reflexive.png", "Reflexive"),
  partner("Relay.png", "Relay"),
  partner("Selini.png", "Selini", "selini"),
  partner("Shorewoods.png", "Shorewood"),
];

export const backedByRow3: BackedByPartner[] = [
  partner("SNZ.png", "SNZ"),
  partner("Spartan.png", "Spartan"),
  partner("Theia.png", "Theia"),
  partner("TowerCapital.png", "Tower Capital"),
  partner("Trident.png", "Trident Digital", "trident"),
  partner("Triton.png", "Triton"),
  partner("VARYS.png", "Varys Capital", "varys"),
  partner("W3.png", "FiveT", "fivet"),
  partner("white_logo_no_padding 2.png", "Anchorage Digital", "anchorage"),
  partner("Bitscale.png", "Bitscale"),
  partner("coinix.png", "Coinix"),
  partner("Crypto.com.png", "Crypto.com"),
];
