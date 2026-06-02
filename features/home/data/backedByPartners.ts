export type BackedByPartner = {
  src: string;
  alt: string;
  logoKey: string;
};

function partner(filename: string, alt: string, logoKey?: string): BackedByPartner {
  return {
    src: `/partners/${encodeURIComponent(filename)}`,
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
  partner("SIG.svg", "SIG", "sig"),
  partner("Amber 1.svg", "Amber"),
  partner("Archimed-Capital 1.svg", "Archimed Capital"),
  partner("Auros 1.svg", "Auros"),
  partner("Bohdi.svg", "Bohdi"),
  partner("ChorusOne.svg", "Chorus One"),
  partner("Consensys.svg", "Consensys", "consensys"),
  partner("FalconX 1.svg", "FalconX"),
  partner("Fasanara 1.svg", "Fasanara"),
  partner("Figment 1.svg", "Figment"),
];

export const backedByRow2: BackedByPartner[] = [
  partner("Fratchis 1.svg", "Frachtis", "frachtis"),
  partner("GSR.svg", "GSR"),
  partner("Gami-Capital 1.svg", "Gami Capital"),
  partner("Group 1321314620.svg", "FiveT", "fivet"),
  partner("L2-Iterative-Ventures 1.svg", "L2 Iterative Ventures", "l2iv"),
  partner("Moonhill 1.svg", "Moonhill Capital", "moonhill"),
  partner("Reflexive 1.svg", "Reflexive"),
  partner("Relay 1.svg", "Relay"),
  partner("Selini.svg", "Selini", "selini"),
  partner("Shorewoods 1.svg", "Shorewood"),
];

export const backedByRow3: BackedByPartner[] = [
  partner("SNZ 1.svg", "SNZ"),
  partner("Spartan 1.svg", "Spartan"),
  partner("TowerCapital 1.svg", "Tower Capital"),
  partner("Trident 1.svg", "Trident Digital", "trident"),
  partner("Triton 1.svg", "Triton"),
  partner("VarysCapital 1.svg", "Varys Capital"),
  partner("white_logo_no_padding 1.svg", "Vector", "vector"),
  partner("bitscale 2.svg", "Bitscale"),
  partner("coinix 1.svg", "Coinix"),
  partner("crypto-com-1 1.svg", "Crypto.com"),
  partner("flowdesk 1.svg", "Flowdesk"),
];
