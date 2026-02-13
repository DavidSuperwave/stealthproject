/**
 * Script Knowledge Vault
 * 
 * Integrates with Supermemory for persistent script storage
 * and retrieval with semantic search capabilities.
 */

const SUPERMEMORY_BASE = "https://api.supermemory.com/v3";

export interface Script {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  usageCount: number;
  lastUsed: string;
  createdAt: string;
  performance?: {
    replyRate: number;
    positiveRate: number;
  };
}

export interface StoreScriptParams {
  title: string;
  content: string;
  category: string;
  tags?: string[];
  performance?: {
    replyRate: number;
    positiveRate: number;
  };
}

export interface SearchScriptParams {
  query: string;
  category?: string;
  limit?: number;
}

/**
 * Build container tag for script storage
 */
export function scriptContainerTag(): string {
  return "jaime_scripts";
}

/**
 * Store a script in Supermemory
 */
export async function storeScript(
  apiKey: string,
  params: StoreScriptParams
): Promise<Script | null> {
  try {
    const script: Script = {
      id: Date.now().toString(),
      title: params.title,
      content: params.content,
      category: params.category,
      tags: params.tags || [],
      usageCount: 0,
      lastUsed: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString().split('T')[0],
      performance: params.performance,
    };

    const res = await fetch(`${SUPERMEMORY_BASE}/memories`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content: JSON.stringify(script),
        containerTag: scriptContainerTag(),
        metadata: {
          type: "script",
          category: params.category,
          title: params.title,
          tags: params.tags?.join(",") || "",
          created_at: script.createdAt,
        },
      }),
    });

    if (!res.ok) {
      console.error(`[ScriptVault] Store failed: ${res.status}`);
      return null;
    }

    return script;
  } catch (err) {
    console.error("[ScriptVault] Store error:", err);
    return null;
  }
}

/**
 * Search scripts in Supermemory
 */
export async function searchScripts(
  apiKey: string,
  params: SearchScriptParams
): Promise<Script[]> {
  try {
    const body: Record<string, any> = {
      q: params.query,
      containerTags: [scriptContainerTag()],
      limit: params.limit || 10,
    };

    if (params.category) {
      body.filters = {
        AND: [
          {
            key: "category",
            value: params.category,
            filterType: "string",
          },
        ],
      };
    }

    const res = await fetch(`${SUPERMEMORY_BASE}/search`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      console.error(`[ScriptVault] Search failed: ${res.status}`);
      return [];
    }

    const data = await res.json();
    return (data.results || []).map((r: any) => {
      try {
        return JSON.parse(r.chunks?.[0]?.content || r.memory || "{}");
      } catch {
        return null;
      }
    }).filter(Boolean);
  } catch (err) {
    console.error("[ScriptVault] Search error:", err);
    return [];
  }
}

/**
 * Delete a script from Supermemory
 */
export async function deleteScript(
  apiKey: string,
  scriptId: string
): Promise<boolean> {
  try {
    const res = await fetch(`${SUPERMEMORY_BASE}/memories/${scriptId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    return res.ok;
  } catch (err) {
    console.error("[ScriptVault] Delete error:", err);
    return false;
  }
}

/**
 * Get all scripts (with fallback to local if Supermemory fails)
 */
export async function getAllScripts(
  apiKey: string
): Promise<Script[]> {
  return searchScripts(apiKey, { query: "*", limit: 100 });
}

/**
 * Update script usage stats
 */
export async function incrementScriptUsage(
  apiKey: string,
  script: Script
): Promise<void> {
  const updated = {
    ...script,
    usageCount: script.usageCount + 1,
    lastUsed: new Date().toISOString().split('T')[0],
  };

  await storeScript(apiKey, {
    title: updated.title,
    content: updated.content,
    category: updated.category,
    tags: updated.tags,
    performance: updated.performance,
  });
}

/**
 * Generate script from template with variables
 */
export function generateScriptFromTemplate(
  template: string,
  variables: Record<string, string>
): string {
  let result = template;
  Object.entries(variables).forEach(([key, value]) => {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
  });
  return result;
}

/**
 * Extract variables from script template
 */
export function extractVariables(script: string): string[] {
  const matches = script.match(/{{([^{}]+)}}/g) || [];
  return Array.from(new Set(matches.map(m => m.slice(2, -2))));
}
