import { useState } from "react";
import { useApp } from "../context/AppContext.jsx";
import { ICON_OPTIONS } from "../data/icons.js";
import Icon from "./Icon.jsx";

// type: "expense" (default) or "income" — which category list this
// instance manages and what new categories it creates as.
export default function CategoryManager({ type = "expense", title = "Categories" }) {
  const { expenseCategories, incomeCategories, addCategory, updateCategory, deleteCategory } = useApp();
  const categories = type === "income" ? incomeCategories : expenseCategories;
  const [editingId, setEditingId] = useState(null);
  const [icon, setIcon] = useState(ICON_OPTIONS[0]);
  const [name, setName] = useState("");

  function startAdd() {
    setEditingId("new");
    setIcon(ICON_OPTIONS[0]);
    setName("");
  }

  function startEdit(category) {
    setEditingId(category.id);
    setIcon(category.icon);
    setName(category.name);
  }

  function cancel() {
    setEditingId(null);
  }

  function save() {
    if (!name.trim()) return;
    if (editingId === "new") {
      addCategory({ icon, name: name.trim(), type });
    } else {
      updateCategory(editingId, { icon, name: name.trim() });
    }
    setEditingId(null);
  }

  return (
    <section className="manager-section">
      <h2>{title}</h2>
      <ul className="manager-list">
        {categories.map((c) => (
          <li key={c.id}>
            <span className="manager-item-label">
              <Icon name={c.icon} /> {c.name}
            </span>
            <span className="manager-actions">
              <button className="btn btn-ghost btn-sm" onClick={() => startEdit(c)}>Edit</button>
              <button className="btn btn-text-danger btn-sm" onClick={() => deleteCategory(c.id)}>
                Delete
              </button>
            </span>
          </li>
        ))}
      </ul>

      {editingId ? (
        <div className="manager-form">
          <div className="icon-grid">
            {ICON_OPTIONS.map((i) => (
              <button
                key={i}
                type="button"
                className={i === icon ? "icon-selected" : ""}
                onClick={() => setIcon(i)}
                aria-label={i.replaceAll("_", " ")}
              >
                <Icon name={i} />
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Category name"
            value={name}
            onChange={(ev) => setName(ev.target.value)}
          />
          <div className="sheet-actions">
            <button className="btn btn-ghost" onClick={cancel}>Cancel</button>
            <button className="btn btn-primary" onClick={save}>Save</button>
          </div>
        </div>
      ) : (
        <button className="btn btn-outline" onClick={startAdd}>+ Add category</button>
      )}
    </section>
  );
}
