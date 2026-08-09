// ISO 3166-1 alpha-2 → human-readable name. Only the codes AMMP actually
// returns for our fleet are populated; everything else falls back to the
// code itself so nothing renders as blank.
const COUNTRY_NAMES = {
    NG: 'Nigeria',
    GH: 'Ghana',
    SN: 'Senegal',
    CI: "Côte d'Ivoire",
    TG: 'Togo',
    ZA: 'South Africa',
    KE: 'Kenya',
    TZ: 'Tanzania',
    UG: 'Uganda',
    RW: 'Rwanda',
    ET: 'Ethiopia',
    ZM: 'Zambia',
    ZW: 'Zimbabwe',
    MW: 'Malawi',
    MZ: 'Mozambique',
    BW: 'Botswana',
    NA: 'Namibia',
    CM: 'Cameroon',
    LR: 'Liberia',
    SL: 'Sierra Leone',
    BJ: 'Benin',
    BF: 'Burkina Faso',
    ML: 'Mali',
    ML2: 'Mali',
    MA: 'Morocco',
    EG: 'Egypt',
    US: 'United States',
    GB: 'United Kingdom',
};

export function countryName(code) {
    if (!code) return '';
    const key = String(code).trim().toUpperCase();
    return COUNTRY_NAMES[key] || key;
}
