export const SupportQueryConstants = {
    TitleMinLength: 3,
    TitleMaxLength: 100,
    DescriptionMinLength: 3,
    DescriptionMaxLength: 1200,
}

export const CustomerConstants = {
    CompanyNameMinLength: 3,
    CompanyNameMaxLength: 255,
}
export const PowerProductionPlanConstants = {
   FileNameMinLength : 3,
   FileNameMaxLength : 255,
   NoteMinLength : 3,
   NoteMaxLength : 255,
   UniqueFileNameMaxLength : 255,
   MaxFileSize : 4 * 1024 * 1024,
}
export const PowerProductionPlanItemConstants = {
   SiteIdMinLength : 3,
   SiteIdMaxLength : 255,
}
export const ReportConstants = {
   FileNameMinLength : 3,
   FileNameMaxLength : 255,
   NameMinLength : 3,
   NameMaxLength : 60,
   SiteIdMinLength : 3,
   SiteIdMaxLength : 255,
   MaxFileSize : 4 * 1024 * 1024,
}

export const SupportQueryMessageConsts = {
    MessageMinLength: 3,
    MessageMaxLength: 255,
}

export const UserConstants = {
    FileNameMinLength: 3,
    FileNameMaxLength: 255,
    NameMinLength: 3,
    NameMaxLength: 400,
    MaxFileSize: 4 * 1024 * 1024,
};

export const ServiceConstants = {
    AmmpServerBaseUrl: "https://data-api.ammp.io",
    AmmpApiKiey: process.env.AMMP_API_KEY,
    MaxAssets: 1000,
}

export const AwsOptions = {
        AccessKey: "<Your access key>",
        Region: "eu-west-1",
        SecretKey: "<Your secret key>"
}

export const parseJwt = (token) => {
    try {
        return JSON.parse(atob(token.split('.')[1]));
    } catch (e) {
        return null;
    }
};


export const normalizeString = inputString => {
    let convertedString = inputString[0]; // Initialize the converted string with the first character
    for (let i = 1; i < inputString.length; i++) {
        // Check if the current character is uppercase
        if (inputString[i] === inputString[i].toUpperCase()) {
            // If it is uppercase, add a space before it and convert it to lowercase
            convertedString += ' ' + inputString[i].toLowerCase();
        } else {
            // If it is lowercase or a number, simply add it to the converted string
            convertedString += inputString[i];
        }
    }
    return convertedString;
}

export const toCommaAmount = (origNum) => {
    let newNum = origNum;
    if (origNum !== null) {
        if (typeof origNum === 'string') {
            newNum = Number(origNum);
        }
        const options = {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        };

        const intNum = new Intl.NumberFormat('en-US', options).format(newNum);
        return intNum.toString();
    }
    return '';
}

// Function to convert large numbers to readable format (e.g., 955,734,000 to 956)
export function toReadableMWh(amount) {
    return Math.round(amount / 1000000);
}

// Function to convert large numbers to readable format (e.g., 955,000 to 956)
export function toReadableKWh(amount) {
    return Math.round(amount / 1000);
}

export function toStringCapacity(wattHours) {
    const tenKilowattHours = 10000; // 10 kWh in watt-hours
    const tenMegawattHours = 10000 * 1000; // 10 MWh in watt-hours

    if (wattHours >= tenMegawattHours) {
        return `${Math.round(wattHours / 1e6).toLocaleString()} MWp`;
    } else if (wattHours >= tenKilowattHours && wattHours < tenMegawattHours) {
        return `${Math.round(wattHours / 1000).toLocaleString()} kWp`;
    } else {
        return `${Math.round(wattHours).toLocaleString()} Wp`;
    }
}

export function formatPower(value) {
    if (value >= 1000000) {
        return (value / 1000000).toFixed(0) + ' MW';
    } else if (value >= 1000) {
        return (value / 1000).toFixed(0) + ' KW';
    } else {
        return value + ' W';
    }
}

export const jsonToCSV = (data) => {
    const csvRows = [];
    const headers = Object.keys(data[0]);
    csvRows.push(headers.join(','));

    for (const row of data) {
        const values = headers.map(header => {
            const escape = ('' + row[header]).replace(/"/g, '\\"');
            return `"${escape}"`;
        });
        csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
};

export const convertRolesToString = (roles) => {
    return roles.map(role => role.name).join('-');
};

export const AllTimezones = [
    {
        id: 0,
        name: 'Africa/Abidjan (UTC)',
    },
    {
        id: 1,
        name: 'Africa/Accra (UTC)',
    },
    {
        id: 2,
        name: 'Africa/Addis_Ababa (UTC+3)',
    },
    {
        id: 3,
        name: 'Africa/Algiers (UTC+1)',
    },
    {
        id: 4,
        name: 'Africa/Asmara (UTC+3)',
    },
    {
        id: 5,
        name: 'Africa/Bamako (UTC)',
    },
    {
        id: 6,
        name: 'Africa/Bangui (UTC+1)',
    },
    {
        id: 7,
        name: 'Africa/Banjul (UTC)',
    },
    {
        id: 8,
        name: 'Africa/Bissau (UTC)',
    },
    {
        id: 9,
        name: 'Africa/Blantyre (UTC+2)',
    },
    {
        id: 10,
        name: 'Africa/Brazzaville (UTC+1)',
    },
    {
        id: 11,
        name: 'Africa/Bujumbura (UTC+2)',
    },
    {
        id: 12,
        name: 'Africa/Cairo (UTC+2)',
    },
    {
        id: 13,
        name: 'Africa/Casablanca (UTC)',
    },
    {
        id: 14,
        name: 'Africa/Ceuta (UTC+1)',
    },
    {
        id: 15,
        name: 'Africa/Conakry (UTC)',
    },
    {
        id: 16,
        name: 'Africa/Dakar (UTC)',
    },
    {
        id: 17,
        name: 'Africa/Dar_es_Salaam (UTC+3)',
    },
    {
        id: 18,
        name: 'Africa/Djibouti (UTC+3)',
    },
    {
        id: 19,
        name: 'Africa/Douala (UTC+1)',
    },
    {
        id: 20,
        name: 'Africa/El_Aaiun (UTC)',
    },
    {
        id: 21,
        name: 'Africa/Freetown (UTC)',
    },
    {
        id: 22,
        name: 'Africa/Gaborone (UTC+2)',
    },
    {
        id: 23,
        name: 'Africa/Harare (UTC+2)',
    },
    {
        id: 24,
        name: 'Africa/Johannesburg (UTC+2)',
    },
    {
        id: 25,
        name: 'Africa/Juba (UTC+3)',
    },
    {
        id: 26,
        name: 'Africa/Kampala (UTC+3)',
    },
    {
        id: 27,
        name: 'Africa/Khartoum (UTC+2)',
    },
    {
        id: 28,
        name: 'Africa/Kigali (UTC+2)',
    },
    {
        id: 29,
        name: 'Africa/Kinshasa (UTC+1)',
    },
    {
        id: 30,
        name: 'Africa/Lagos (UTC+1)',
    },
    {
        id: 31,
        name: 'Africa/Libreville (UTC+1)',
    },
    {
        id: 32,
        name: 'Africa/Lome (UTC)',
    },
    {
        id: 33,
        name: 'Africa/Luanda (UTC+1)',
    },
    {
        id: 34,
        name: 'Africa/Lubumbashi (UTC+2)',
    },
    {
        id: 35,
        name: 'Africa/Lusaka (UTC+2)',
    },
    {
        id: 36,
        name: 'Africa/Malabo (UTC+1)',
    },
    {
        id: 37,
        name: 'Africa/Maputo (UTC+2)',
    },
    {
        id: 38,
        name: 'Africa/Maseru (UTC+2)',
    },
    {
        id: 39,
        name: 'Africa/Mbabane (UTC+2)',
    },
    {
        id: 40,
        name: 'Africa/Mogadishu (UTC+3)',
    },
    {
        id: 41,
        name: 'Africa/Monrovia (UTC)',
    },
    {
        id: 42,
        name: 'Africa/Nairobi (UTC+3)',
    }
];
