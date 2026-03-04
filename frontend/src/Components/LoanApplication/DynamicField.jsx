export default function DynamicField({ label, value, onChange }) {
    const key = label
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");

    const type =
        label.toLowerCase().includes("date") ? "date" :
            label.toLowerCase().includes("amount") ? "number" :
                "text";

    return (
        <label className="loan-label">
            {label}
            <input
                type={type}
                value={value || ""}
                onChange={(e) => onChange(key, e.target.value)}
                className="loan-input"
            />
        </label>
    );
}
