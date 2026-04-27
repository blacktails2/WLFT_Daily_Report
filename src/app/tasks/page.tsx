"use client";

import { useState, useEffect } from "react";
import { Plus, Archive, ArchiveRestore, Trash2 } from "lucide-react";
import { TrelloSettings } from "@/components/trello-settings";
import { Toast } from "@/components/toast";
import { PageTitle } from "@/components/page-title";

interface Task {
  id: string;
  name: string;
  color: string;
  archived: boolean;
  sortOrder: number;
}

const headingStyle = {
  fontFamily: '"Doppo Expanded Black", sans-serif',
  fontSize: "24px",
  fontFeatureSettings: '"ss01", "ss02", "ss03", "ss04", "ss06"',
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskName, setNewTaskName] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    fetchTasks();
  }, []);

  async function fetchTasks() {
    const res = await fetch("/api/tasks?includeArchived=true&sortByRecent=true");
    const data = await res.json();
    setTasks(data);
  }

  function showToast(message: string) {
    setToast(null);
    requestAnimationFrame(() => setToast(message));
  }

  async function createTask() {
    if (!newTaskName.trim()) return;
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newTaskName.trim() }),
    });
    const task = await res.json();
    setNewTaskName("");
    fetchTasks();
    showToast(`"${task.name}" added`);
  }

  async function updateTask(id: string, updates: Partial<Task>) {
    await fetch(`/api/tasks/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    fetchTasks();
    setEditingId(null);
  }

  async function deleteTask(id: string, name: string) {
    if (!confirm(`Delete "${name}"? Time entries for this task will also be deleted.`)) return;
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    fetchTasks();
    showToast(`"${name}" deleted`);
  }

  const activeTasks = tasks.filter((t) => !t.archived);
  const archivedTasks = tasks.filter((t) => t.archived);

  return (
    <div className="max-w-3xl px-6 pt-18 pb-6 relative z-10">
      <PageTitle title="Tasks" />

      {/* Add Task */}
      <div className="flex items-center gap-3 mb-8">
        <input
          type="text"
          value={newTaskName}
          onChange={(e) => setNewTaskName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && !e.nativeEvent.isComposing) {
              e.preventDefault();
              createTask();
            }
          }}
          placeholder="New task name... (⌘+Enter)"
          className={`flex-1 bg-transparent py-2 focus:outline-none transition-all ease-in duration-100 border-b ${
            newTaskName ? "border-[var(--color-main)]" : "border-transparent focus:border-[var(--color-main)]"
          }`}
          style={{ fontSize: "21px" }}
        />
        <button
          onClick={createTask}
          className="flex items-center gap-1 px-4 py-2 bg-[var(--color-accent)] text-white rounded-full border border-[var(--color-accent)] hover:bg-[var(--color-bg)] hover:text-[var(--color-accent)] transition-all ease-in duration-100"
        >
          <Plus size={16} />
          Add
        </button>
      </div>

      {/* Current Tasks */}
      <div className="mb-8">
        <label className="block mb-3 text-[var(--color-accent)]" style={headingStyle}>
          Current Tasks
        </label>

        {activeTasks.map((task) => (
          <div
            key={task.id}
            className="border-t border-[var(--color-main)] pt-3 pb-10 flex items-center gap-3"
            style={{ fontSize: "21px" }}
          >
            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: task.color }} />

            <div className="flex-1">
              {editingId === task.id ? (
                <input
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") updateTask(task.id, { name: editingName });
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  onBlur={() => updateTask(task.id, { name: editingName })}
                  className="w-full bg-transparent border-b border-[var(--color-accent)] outline-none"
                  autoFocus
                />
              ) : (
                <span
                  className="cursor-pointer"
                  onClick={() => { setEditingId(task.id); setEditingName(task.name); }}
                >
                  {task.name}
                </span>
              )}
            </div>

            <button
              onClick={() => updateTask(task.id, { archived: true })}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[var(--color-accent)] hover:text-white transition-all ease-in duration-100"
              title="Archive"
            >
              <Archive size={16} />
            </button>
          </div>
        ))}

        {activeTasks.length === 0 && (
          <p className="text-[var(--color-main-hover)] text-center py-8">
            No tasks yet. Add one above to get started.
          </p>
        )}
      </div>

      {/* Trello Integration */}
      <div className="mb-8">
        <TrelloSettings onSync={fetchTasks} />
      </div>

      {/* Archived Tasks */}
      {archivedTasks.length > 0 && (
        <div>
          <button
            onClick={() => setShowArchived(!showArchived)}
            className="text-sm text-[var(--color-main-hover)] hover:text-[var(--color-accent)] mb-2"
          >
            {showArchived ? "Hide" : "Show"} Archived ({archivedTasks.length})
          </button>
          {showArchived && (
            <div>
              {archivedTasks.map((task) => (
                <div
                  key={task.id}
                  className="border-t border-[var(--color-main)] pt-3 pb-10 flex items-center gap-3 opacity-40"
                  style={{ fontSize: "21px" }}
                >
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: task.color }} />
                  <span className="flex-1">{task.name}</span>
                  <button
                    onClick={() => updateTask(task.id, { archived: false })}
                    className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[var(--color-accent)] hover:text-white transition-all ease-in duration-100"
                    title="Restore"
                  >
                    <ArchiveRestore size={16} />
                  </button>
                  <button
                    onClick={() => deleteTask(task.id, task.name)}
                    className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[var(--color-accent)] hover:text-white transition-all ease-in duration-100"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <Toast message={toast} onDone={() => setToast(null)} />
    </div>
  );
}
