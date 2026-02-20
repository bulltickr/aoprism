export class DependencyResolver {
  constructor(processes = []) {
    this.processes = new Map();
    
    for (const process of processes) {
      this.addProcess(process);
    }
  }

  addProcess(process) {
    this.processes.set(process.id, process);
  }

  removeProcess(processId) {
    this.processes.delete(processId);
  }

  resolve(processId, resolved = new Set(), unresolved = new Set()) {
    const process = this.processes.get(processId);
    
    if (!process) {
      throw new Error(`Process ${processId} not found`);
    }
    
    if (unresolved.has(processId)) {
      throw new Error(`Circular dependency detected: ${processId}`);
    }

    unresolved.add(processId);

    const dependencies = [];
    
    for (const dep of (process.dependencies || [])) {
      if (resolved.has(dep.processId)) {
        continue;
      }
      
      const subDeps = this.resolve(dep.processId, resolved, unresolved);
      dependencies.push(...subDeps);
    }

    unresolved.delete(processId);
    resolved.add(processId);
    dependencies.push(process);
    
    return dependencies;
  }

  checkConflicts(processId) {
    const dependencies = this.resolve(processId);
    const conflicts = [];
    
    const byName = new Map();
    
    for (const dep of dependencies) {
      const name = dep.name?.toLowerCase();
      if (!name) continue;
      
      if (!byName.has(name)) {
        byName.set(name, []);
      }
      byName.get(name).push(dep);
    }

    for (const [name, versions] of byName) {
      if (versions.length > 1) {
        conflicts.push({
          name,
          versions: versions.map(v => ({
            id: v.id,
            version: v.version,
          })),
        });
      }
    }
    
    return conflicts;
  }

  getDependencyTree(processId, depth = 0, visited = new Set()) {
    if (depth > 10 || visited.has(processId)) {
      return null;
    }

    visited.add(processId);
    
    const process = this.processes.get(processId);
    if (!process) {
      return null;
    }

    const tree = {
      id: process.id,
      name: process.name,
      version: process.version,
      children: [],
    };

    for (const dep of (process.dependencies || [])) {
      const child = this.getDependencyTree(dep.processId, depth + 1, visited);
      if (child) {
        tree.children.push(child);
      }
    }

    return tree;
  }

  getDependents(processId) {
    const dependents = [];
    
    for (const process of this.processes.values()) {
      const dependsOn = (process.dependencies || []).some(
        dep => dep.processId === processId
      );
      
      if (dependsOn) {
        dependents.push({
          id: process.id,
          name: process.name,
          version: process.version,
        });
      }
    }
    
    return dependents;
  }

  validateDependencies(processId) {
    const errors = [];
    const warnings = [];
    
    const process = this.processes.get(processId);
    if (!process) {
      errors.push(`Process ${processId} not found`);
      return { valid: false, errors, warnings };
    }

    for (const dep of (process.dependencies || [])) {
      if (!this.processes.has(dep.processId)) {
        errors.push(`Dependency "${dep.name || dep.processId}" not found`);
      }
    }

    try {
      this.resolve(processId);
    } catch (error) {
      errors.push(error.message);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  findInstallationOrder(processIds) {
    const allDeps = new Set();
    
    for (const processId of processIds) {
      try {
        const deps = this.resolve(processId);
        for (const dep of deps) {
          allDeps.add(dep.id);
        }
      } catch (error) {
        console.warn(`Could not resolve dependencies for ${processId}:`, error.message);
      }
    }

    const ordered = [];
    const visited = new Set();

    const installOrder = (id) => {
      if (visited.has(id)) return;
      visited.add(id);
      
      const process = this.processes.get(id);
      if (!process) return;
      
      for (const dep of (process.dependencies || [])) {
        installOrder(dep.processId);
      }
      
      ordered.push({
        id: process.id,
        name: process.name,
        version: process.version,
      });
    };

    for (const id of allDeps) {
      installOrder(id);
    }

    return ordered;
  }
}

export function createDependencyResolver(processes) {
  return new DependencyResolver(processes);
}

export default DependencyResolver;
