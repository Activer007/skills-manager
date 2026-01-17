# Change summary: Enhanced Marketplace with GitHub URL import, virtual scrolling for performance, and improved SkillCard accessibility.

The implementation of virtual scrolling using `react-window` is a significant performance improvement for large datasets, but the current structural implementation (defining `Cell` inside the component) nullifies these gains and introduces severe performance regressions. Additionally, the matching logic for installed skills needs to be reconciled between marketplace slugs and local paths to ensure UI accuracy.

## File: src/components/ImportSkillModal.tsx
### L30: [MEDIUM] Restrictive GitHub URL validation regex.

The current regex `const githubRegex = /^https:\/\/github\.com\/[\w-]+\/[\w.-]+(\/tree\/[\w.-]+(\/.*)?)?$/` does not account for common URL patterns such as `/blob/` (often copied when viewing a specific file) or URLs with `.git` suffixes. It may prevent users from importing skills if they copy a slightly different URL format.

Suggested change:
```
-    const githubRegex = /^https:\/\/github\.com\/[\w-]+\/[\w.-]+(\/tree\/[\w.-]+(\/.*)?)?$/;
+    const githubRegex = /^https:\/\/github\.com\/[\w-]+\/[\w.-]+(\/(tree|blob)\/[\w.-]+(\/.*)?)?$/;
```

### L45: [LOW] Weak skill name extraction for sub-directory imports.

Using `url.match(/\/([^\/]+)(\/tree\/|$)/)` will extract the repository name even if the user is importing a skill from a deep sub-directory (e.g., `.../repo/tree/main/skills/my-skill` will extract `repo`). It is better to use the last segment of the path as the default name.

Suggested change:
```
-    const nameMatch = url.match(/\/([^\/]+)(\/tree\/|$)/);
-    const skillName = nameMatch ? nameMatch[1] : 'Skill';
+    const skillName = url.split('/').filter(Boolean).pop()?.replace(/\.git$/, '') || 'Skill';
```

### L82: [LOW] Manual translation pattern instead of using `t()` function.

The component initializes `useTranslation` but doesn't destructure `t`, leading to verbose ternary operators for every string. This is inconsistent with other parts of the codebase like `Marketplace.tsx`.

Suggested change:
```
-  const { i18n } = useTranslation();
+  const { t, i18n } = useTranslation();
...
-      title={i18n.language === 'zh' ? '导入 GitHub Skill' : 'Import GitHub Skill'}
+      title={t('importGithubSkill', { defaultValue: i18n.language === 'zh' ? '导入 GitHub Skill' : 'Import GitHub Skill' })}
```

## File: src/pages/Marketplace.tsx
### L98: [CRITICAL] Cell component defined inside Marketplace component.

Defining the `Cell` component within the `Marketplace` function body causes it to be re-created on every render of the parent. This forces `react-window` to unmount and remount every single visible cell on every render, completely defeating the purpose of virtualization and causing severe performance lag and loss of component state (e.g., hover states, animations).

Suggested change:
```
+// Define outside or memoize to prevent re-creation
+const Cell = memo(({ columnIndex, rowIndex, style, data }: any) => {
+  const { skills, columnCount, isInstalled, handleInstall, setSelectedSkill, setShowDrawer, language } = data;
+  const index = rowIndex * columnCount + columnIndex;
+  if (index >= skills.length) return null;
+  const skill = skills[index];
+
+  const left = (style.left as number) + GUTTER_SIZE / 2;
+  const top = (style.top as number) + GUTTER_SIZE / 2;
+  const width = (style.width as number) - GUTTER_SIZE;
+  const height = (style.height as number) - GUTTER_SIZE;
+
+  return (
+    <div style={{ ...style, left, top, width, height }}>
+      <SkillCard
+        skill={{...skill, description: getLocalizedDescription(skill, language)}}
+        viewMode="grid"
+        isInstalled={isInstalled(skill.id)}
+        onInstall={() => handleInstall(skill)}
+        onViewDetails={() => {
+          setSelectedSkill(skill);
+          setShowDrawer(true);
+        }}
+      />
+    </div>
+  );
+});
```

### L82: [HIGH] Mismatched ID comparison in `isInstalled`.

In `useSkills.ts`, installed skills are assigned the local file path as their `id`. In `Marketplace.tsx`, marketplace items use a slug as their `id`. This comparison `installedSkills.some(s => s.id === skillId)` will always return false for marketplace items, preventing the UI from showing which skills are already installed.

Suggested change:
```
   const isInstalled = (skillId: string) => {
-    return installedSkills.some(s => s.id === skillId);
+    // Compare by name or githubUrl as a more reliable fallback if IDs don't match
+    return installedSkills.some(s => s.id === skillId || s.name === skillId || (s.githubUrl && marketplaceSkills.find(m => m.id === skillId)?.githubUrl === s.githubUrl));
   };
```

### L343: [MEDIUM] Grid `itemData` is not memoized.

Passing a new object literal `itemData={{ skills: filteredSkills, columnCount }}` to the `Grid` on every render causes all cells to re-render even when the data hasn't changed. This should be memoized using `useMemo`.

Suggested change:
```
+  const itemData = useMemo(() => ({
+    skills: filteredSkills,
+    columnCount,
+    isInstalled,
+    handleInstall,
+    setSelectedSkill,
+    setShowDrawer,
+    language: i18n.language
+  }), [filteredSkills, columnCount, isInstalled, i18n.language]);
+
   return (
...
-                            itemData={{ skills: filteredSkills, columnCount }}
+                            itemData={itemData}
```

## File: src/components/SkillCard.tsx
### L46: [LOW] Hardcoded text colors on dynamic backgrounds.

While the brightness calculation is great for accessibility, using raw `text-black` and `text-white` might clash with some themes or look too harsh compared to the rest of the UI's color palette (e.g., `slate-900`).

Suggested change:
```
-        return brightness > 0.5 ? 'text-black' : 'text-white';
+        return brightness > 0.5 ? 'text-slate-900' : 'text-slate-50';
```