export interface SimulatedAddress {
    address: string;
    postcode: string;
    lat: number;
    lng: number;
    houseNumber?: string;
    houseName?: string;
    street: string;
    town: string;
}

export const simulatedAddresses: SimulatedAddress[] = [
    // --- SL8 5JQ (Hawks Hill, Bourne End) ---
    {
        address: "45 Hawks Hill, Bourne End, SL8 5JQ",
        postcode: "SL8 5JQ",
        lat: 51.5814,
        lng: -0.7124,
        houseNumber: "45",
        street: "Hawks Hill",
        town: "Bourne End"
    },
    {
        address: "47 Hawks Hill, Bourne End, SL8 5JQ",
        postcode: "SL8 5JQ",
        lat: 51.5815,
        lng: -0.7125,
        houseNumber: "47",
        street: "Hawks Hill",
        town: "Bourne End"
    },
    {
        address: "49 Hawks Hill, Bourne End, SL8 5JQ",
        postcode: "SL8 5JQ",
        lat: 51.5816,
        lng: -0.7126,
        houseNumber: "49",
        street: "Hawks Hill",
        town: "Bourne End"
    },
    {
        address: "51 Hawks Hill, Bourne End, SL8 5JQ",
        postcode: "SL8 5JQ",
        lat: 51.5817,
        lng: -0.7127,
        houseNumber: "51",
        street: "Hawks Hill",
        town: "Bourne End"
    },
    {
        address: "Mendip, Hawks Hill, Bourne End, SL8 5JQ",
        postcode: "SL8 5JQ",
        lat: 51.5818,
        lng: -0.7128,
        houseName: "Mendip",
        street: "Hawks Hill",
        town: "Bourne End"
    },
    {
        address: "Oakridge, Hawks Hill, Bourne End, SL8 5JQ",
        postcode: "SL8 5JQ",
        lat: 51.5819,
        lng: -0.7129,
        houseName: "Oakridge",
        street: "Hawks Hill",
        town: "Bourne End"
    },


    // --- HP10 0JQ (Wooburn Manor Park, Wooburn Green) ---
    {
        address: "65 Wooburn Manor Park, Wooburn Green, HP10 0JQ",
        postcode: "HP10 0JQ",
        lat: 51.5831,
        lng: -0.6901,
        houseNumber: "65",
        street: "Wooburn Manor Park",
        town: "Wooburn Green"
    },
    {
        address: "66 Wooburn Manor Park, Wooburn Green, HP10 0JQ",
        postcode: "HP10 0JQ",
        lat: 51.5832,
        lng: -0.6902,
        houseNumber: "66",
        street: "Wooburn Manor Park",
        town: "Wooburn Green"
    },
    {
        address: "67 Wooburn Manor Park, Wooburn Green, HP10 0JQ",
        postcode: "HP10 0JQ",
        lat: 51.5833,
        lng: -0.6903,
        houseNumber: "67",
        street: "Wooburn Manor Park",
        town: "Wooburn Green"
    },
    {
        address: "68 Wooburn Manor Park, Wooburn Green, HP10 0JQ",
        postcode: "HP10 0JQ",
        lat: 51.5834,
        lng: -0.6904,
        houseNumber: "68",
        street: "Wooburn Manor Park",
        town: "Wooburn Green"
    },

    // --- SL7 1AB (Victoria Gardens, Marlow) ---
    {
        address: "1 Victoria Gardens, Marlow, SL7 1AB",
        postcode: "SL7 1AB",
        lat: 51.5721,
        lng: -0.7741,
        houseNumber: "1",
        street: "Victoria Gardens",
        town: "Marlow"
    },
    {
        address: "2 Victoria Gardens, Marlow, SL7 1AB",
        postcode: "SL7 1AB",
        lat: 51.5722,
        lng: -0.7742,
        houseNumber: "2",
        street: "Victoria Gardens",
        town: "Marlow"
    },
    {
        address: "3 Victoria Gardens, Marlow, SL7 1AB",
        postcode: "SL7 1AB",
        lat: 51.5723,
        lng: -0.7743,
        houseNumber: "3",
        street: "Victoria Gardens",
        town: "Marlow"
    },

    // --- SL6 9SP (School Lane, Cookham) ---
    {
        address: "The Malt Cottage, School Lane, Cookham, SL6 9SP",
        postcode: "SL6 9SP",
        lat: 51.5611,
        lng: -0.6971,
        houseName: "The Malt Cottage",
        street: "School Lane",
        town: "Cookham"
    },
    {
        address: "School Cottage, School Lane, Cookham, SL6 9SP",
        postcode: "SL6 9SP",
        lat: 51.5612,
        lng: -0.6972,
        houseName: "School Cottage",
        street: "School Lane",
        town: "Cookham"
    },

    // --- SL7 2EX (Frieth Road, Marlow) ---
    {
        address: "Royal Oak, Frieth Road, Marlow, SL7 2EX",
        postcode: "SL7 2EX",
        lat: 51.5898,
        lng: -0.8012,
        houseName: "Royal Oak",
        street: "Frieth Road",
        town: "Marlow"
    },

    // --- SL8 5RU (Cores End Road, Bourne End) ---
    {
        address: "3 Riverside, Cores End Road, Bourne End, SL8 5RU",
        postcode: "SL8 5RU",
        lat: 51.5801,
        lng: -0.7101,
        houseNumber: "3",
        street: "Riverside",
        town: "Bourne End"
    },
    {
        address: "4 Riverside, Cores End Road, Bourne End, SL8 5RU",
        postcode: "SL8 5RU",
        lat: 51.5802,
        lng: -0.7102,
        houseNumber: "4",
        street: "Riverside",
        town: "Bourne End"
    },

    // --- HP9 1AD (London Road, Beaconsfield) ---
    {
        address: "12 London Road, Beaconsfield, HP9 1AD",
        postcode: "HP9 1AD",
        lat: 51.6015,
        lng: -0.6412,
        houseNumber: "12",
        street: "London Road",
        town: "Beaconsfield"
    },
    {
        address: "14 London Road, Beaconsfield, HP9 1AD",
        postcode: "HP9 1AD",
        lat: 51.6016,
        lng: -0.6413,
        houseNumber: "14",
        street: "London Road",
        town: "Beaconsfield"
    },
    {
        address: "16 London Road, Beaconsfield, HP9 1AD",
        postcode: "HP9 1AD",
        lat: 51.6017,
        lng: -0.6414,
        houseNumber: "16",
        street: "London Road",
        town: "Beaconsfield"
    },
    {
        address: "Cedar House, London Road, Beaconsfield, HP9 1AD",
        postcode: "HP9 1AD",
        lat: 51.6018,
        lng: -0.6415,
        houseName: "Cedar House",
        street: "London Road",
        town: "Beaconsfield"
    },

    // --- HP10 9ES (Heath End Road, Flackwell Heath) ---
    {
        address: "89 Heath End Road, Flackwell Heath, HP10 9ES",
        postcode: "HP10 9ES",
        lat: 51.6045,
        lng: -0.7172,
        houseNumber: "89",
        street: "Heath End Road",
        town: "Flackwell Heath"
    },
    {
        address: "91 Heath End Road, Flackwell Heath, HP10 9ES",
        postcode: "HP10 9ES",
        lat: 51.6046,
        lng: -0.7173,
        houseNumber: "91",
        houseName: "The Stag",
        street: "Heath End Road",
        town: "Flackwell Heath"
    },
    {
        address: "93 Heath End Road, Flackwell Heath, HP10 9ES",
        postcode: "HP10 9ES",
        lat: 51.6047,
        lng: -0.7174,
        houseNumber: "93",
        street: "Heath End Road",
        town: "Flackwell Heath"
    },

    // --- HP10 9LD (Blind Lane, Flackwell Heath) ---
    {
        address: "239 Blind Lane, Flackwell Heath, HP10 9LD",
        postcode: "HP10 9LD",
        lat: 51.5943,
        lng: -0.7013,
        houseNumber: "239",
        street: "Blind Lane",
        town: "Flackwell Heath"
    },
    {
        address: "241 Blind Lane, Flackwell Heath, HP10 9LD",
        postcode: "HP10 9LD",
        lat: 51.5944,
        lng: -0.7014,
        houseNumber: "241",
        houseName: "Green Dragon",
        street: "Blind Lane",
        town: "Flackwell Heath"
    },
    {
        address: "243 Blind Lane, Flackwell Heath, HP10 9LD",
        postcode: "HP10 9LD",
        lat: 51.5945,
        lng: -0.7015,
        houseNumber: "243",
        street: "Blind Lane",
        town: "Flackwell Heath"
    },

    // --- HP10 9TX (Boundary Road, Loudwater) ---
    {
        address: "10 Boundary Road, Loudwater, HP10 9TX",
        postcode: "HP10 9TX",
        lat: 51.6081,
        lng: -0.7001,
        houseNumber: "10",
        street: "Boundary Road",
        town: "Loudwater"
    },
    {
        address: "12 Boundary Road, Loudwater, HP10 9TX",
        postcode: "HP10 9TX",
        lat: 51.6082,
        lng: -0.7002,
        houseNumber: "12",
        street: "Boundary Road",
        town: "Loudwater"
    },
    {
        address: "14 Boundary Road, Loudwater, HP10 9TX",
        postcode: "HP10 9TX",
        lat: 51.6083,
        lng: -0.7003,
        houseNumber: "14",
        street: "Boundary Road",
        town: "Loudwater"
    },

    // --- SL6 1QJ (High Street, Maidenhead) ---
    {
        address: "45 High Street, Maidenhead, SL6 1QJ",
        postcode: "SL6 1QJ",
        lat: 51.5218,
        lng: -0.7225,
        houseNumber: "45",
        street: "High Street",
        town: "Maidenhead"
    },
    {
        address: "47 High Street, Maidenhead, SL6 1QJ",
        postcode: "SL6 1QJ",
        lat: 51.5219,
        lng: -0.7226,
        houseNumber: "47",
        street: "High Street",
        town: "Maidenhead"
    },
    {
        address: "49 High Street, Maidenhead, SL6 1QJ",
        postcode: "SL6 1QJ",
        lat: 51.5220,
        lng: -0.7227,
        houseNumber: "49",
        street: "High Street",
        town: "Maidenhead"
    },
    {
        address: "Nicholsons House, High Street, Maidenhead, SL6 1QJ",
        postcode: "SL6 1QJ",
        lat: 51.5221,
        lng: -0.7228,
        houseName: "Nicholsons House",
        street: "High Street",
        town: "Maidenhead"
    }
];

/**
 * Normalizes UK Postcode strings for clean comparisons
 */
export function normalizePostcode(pc: string): string {
    return pc.toUpperCase().replace(/\s+/g, '').trim();
}

/**
 * Searches the simulated database by postcode and an optional remainder (door number / house name)
 */
export function searchByPostcode(postcode: string, remainder?: string): SimulatedAddress[] {
    const normPC = normalizePostcode(postcode);
    const matches = simulatedAddresses.filter(addr => normalizePostcode(addr.postcode) === normPC);

    if (remainder && remainder.trim()) {
        const normRem = remainder.toLowerCase().trim();
        return matches.filter(addr => {
            return (
                addr.address.toLowerCase().includes(normRem) ||
                (addr.houseNumber && addr.houseNumber.toLowerCase() === normRem) ||
                (addr.houseName && addr.houseName.toLowerCase().includes(normRem))
            );
        });
    }

    return matches;
}

/**
 * Searches the simulated database by general text (matching house names, streets, combinations)
 */
export function searchByText(query: string): SimulatedAddress[] {
    const normQuery = query.toLowerCase().trim();
    if (!normQuery) return [];

    // Split words to support house name + road matching (e.g. "mendip hawks hill")
    const words = normQuery.split(/\s+/);

    return simulatedAddresses.filter(addr => {
        // Must match all query words in the full address
        return words.every(word => addr.address.toLowerCase().includes(word));
    });
}
