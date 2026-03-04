import DynamicField from "./DynamicField";

export default function DocumentsSection({ title, fields, data, setData }) {
    return (
        <div className="loan-section">
            <h4>{title}</h4>

            {fields.map((field) => (
                <DynamicField
                    key={field}
                    label={field}
                    value={data[
                        field.toLowerCase().replace(/[^a-z0-9]/g, "")
                        ]}
                    onChange={(k, v) =>
                        setData((prev) => ({ ...prev, [k]: v }))
                    }
                />
            ))}
        </div>
    );
}
