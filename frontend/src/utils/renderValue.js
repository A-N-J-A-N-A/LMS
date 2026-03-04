
export const renderValue = (val) => {
    if (val === null || val === undefined) return "-";

    // Handle backend date objects like { date, timestamp }
    if (typeof val === "object") {
        if (val.timestamp) {
            return new Date(val.timestamp).toLocaleDateString();
        }

        // Fallback for any unexpected object
        return JSON.stringify(val);
    }

    // String / number / boolean
    return val;
};