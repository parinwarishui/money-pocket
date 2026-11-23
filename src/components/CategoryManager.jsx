import { useState } from "react";
import { useApp } from "../context/AppContext.jsx";
import { EMOJI_OPTIONS } from "../data/emojiOptions.js";

export default function CategoryManager() {
  const { categories, addCategory, updateCategory, deleteCategory } = useApp();
  const [editingId, setEditingId] = useState(null);
  const [emoji, setEmoji] = useState(EMOJI_OPTIONS[0]);
  const [name, setName] = useState("");

  function startAdd() {
    setEditingId("new");
    setEmoji(EMOJI_OPTIONS[0]);
    setName("");
  }

  function startEdit(category) {
    setEditingId(category.id);
    setEmoji(category.emoji);
    setName(category.name);
  }

  function cancel() {
    setEditingId(null);
  }

  function save() {
    if (!name.trim()) return;
    if (editingId === "new") {
      addCategory({ emoji, name: name.trim() });
    } else {
      updateCategory(editingId, { emoji, name: name.trim() });
    }
    setEditingId(null);
  }

  return (
    <section className="manager-section">
      <h2>Categories</h2>
      <ul className="manager-list">
        {categories.map((c) => (
          <li key={c.id}>
            <span>{c.emoji} {c.name}</span>
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
          <div className="emoji-grid">
            {EMOJI_OPTIONS.map((e) => (
              <button
                key={e}
                type="button"
                className={e === emoji ? "emoji-selected" : ""}
                onClick={() => setEmoji(e)}
              >
                {e}
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
