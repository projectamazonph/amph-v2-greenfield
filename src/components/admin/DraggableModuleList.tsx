"use client";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Hamburger } from "@phosphor-icons/react/dist/ssr";
import { reorderModulesAction } from "@/app/actions/reorderModules.action";
import type { Module as AdminModule } from "@/domain/entities/Module";
import styles from "./DraggableModuleList.module.css";

interface DraggableModuleListProps {
  courseId: string;
  modules: readonly AdminModule[];
}

interface ModuleItemProps {
  module: AdminModule;
  index: number;
}

function ModuleItem({ module, index }: ModuleItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: module.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`${styles.moduleItem} ${isDragging ? styles.dragging : ""}`}
    >
      <div
        className={styles.dragHandle}
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
      >
        <Hamburger size={18} weight="regular" />
      </div>
      <span className={styles.moduleOrder}>{index + 1}.</span>
      <span className={styles.moduleTitle}>{module.title}</span>
    </li>
  );
}

export function DraggableModuleList({ courseId, modules }: DraggableModuleListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const newOrder = Array.from(modules);
      const oldIndex = newOrder.findIndex((m) => m.id === active.id);
      const newIndex = newOrder.findIndex((m) => m.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const removed = newOrder[oldIndex]!;
        newOrder.splice(oldIndex, 1);
        newOrder.splice(newIndex, 0, removed);

        await reorderModulesAction({
          courseId,
          moduleIds: newOrder.map((m) => m.id),
        });
      }
    }
  }

  if (modules.length === 0) {
    return (
      <p className={styles.empty}>
        No modules yet. Add the first module to start building the curriculum.
      </p>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={modules.map((m) => m.id)} strategy={verticalListSortingStrategy}>
        <ul className={styles.moduleList} role="list" aria-label="Course modules">
          {[...modules]
            .sort((a, b) => a.displayOrder - b.displayOrder)
            .map((module, index) => (
              <ModuleItem key={module.id} module={module} index={index} />
            ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}
