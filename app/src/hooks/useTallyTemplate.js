import { useState, useCallback } from 'react';
import { executeTemplate, clearAuth } from '../services/tallyApi';
import { getTemplate } from '../config/tallyTemplates';

/**
 * Fetch a Tally OS V3 template's report data.
 * @param {string} templateKey — key in TALLY_TEMPLATES
 */
export function useTallyTemplate(templateKey) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async (variables = {}) => {
    const tpl = getTemplate(templateKey);
    if (!tpl) {
      setError(`Unknown template: ${templateKey}`);
      return null;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await executeTemplate(tpl.templateNo, variables);
      setData(result);
      return result;
    } catch (e) {
      setError(e.message || 'Failed to load from Tally.');
      return null;
    } finally {
      setLoading(false);
    }
  }, [templateKey]);

  const refresh = useCallback((variables) => {
    clearAuth(); // force re-auth to get a fresh accessToken
    return fetchData(variables);
  }, [fetchData]);

  return { data, loading, error, fetchData, refresh };
}
