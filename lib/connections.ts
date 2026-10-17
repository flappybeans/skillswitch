export type Relation =
  | { kind: "none" }
  | { kind: "sent"; connectionId: string }
  | { kind: "received"; connectionId: string }
  | { kind: "connected"; connectionId: string };

type ConnectionRow = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: string;
};

// Map of otherUserId → my relation to them
export function buildRelations(
  meId: string,
  rows: ConnectionRow[]
): Map<string, Relation> {
  const map = new Map<string, Relation>();

  for (const row of rows) {
    const iAmRequester = row.requester_id === meId;
    const otherId = iAmRequester ? row.addressee_id : row.requester_id;

    if (row.status === "accepted") {
      map.set(otherId, { kind: "connected", connectionId: row.id });
    } else if (row.status === "pending") {
      map.set(
        otherId,
        iAmRequester
          ? { kind: "sent", connectionId: row.id }
          : { kind: "received", connectionId: row.id }
      );
    } else if (row.status === "rejected" && iAmRequester) {
      // They declined me. I just see "Requested" (no rejection notice).
    	map.set(otherId, { kind: "sent", connectionId: row.id });
    }
    // rejected and I'm the addressee: I declined them, so it stays "none"
    // and I can still change my mind.
  }

  return map;
}