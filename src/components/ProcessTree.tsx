import { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, Folder, FileText, ChevronsDown, ChevronsUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Process2, Process3 } from '@/types/database';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface ProcessTreeProps {
  onSelectProcess: (f3Index: string | null) => void;
  selectedProcess: string | null;
  refreshTrigger?: number;
}

interface TreeNode {
  f2: Process2;
  children3: Process3[];
}

export const ProcessTree = ({ onSelectProcess, selectedProcess, refreshTrigger }: ProcessTreeProps) => {
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [filledF2, setFilledF2] = useState<Set<string>>(new Set());
  const [filledF3, setFilledF3] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadTreeData();
  }, [refreshTrigger]);

  const loadTreeData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userAccess } = await supabase
        .from('user_access')
        .select('f1_index');

      const accessibleF1 = userAccess?.map(a => a.f1_index) || [];

      const { data: p2Data } = await supabase
        .from('process_2')
        .select('*')
        .in('f1_index', accessibleF1)
        .order('sort');

      const { data: p3Data } = await supabase
        .from('process_3')
        .select('*')
        .order('sort');

      const { data: p4Data } = await supabase
        .from('process_4')
        .select('f4_index, f3_index')
        .eq('is_active', true);

      const availableF3 = new Set(p4Data?.map(p4 => p4.f3_index) || []);

      // Load filled processes data
      const { data: filledData } = await supabase
        .from('user_responses')
        .select(`
          f4_index,
          system_id,
          labor_hours,
          notes
        `)
        .eq('user_id', user.id)
        .or('labor_hours.gt.0,system_id.not.is.null,notes.not.is.null');

      // Фильтруем только реально заполненные записи (исключаем пустые строки)
      const actuallyFilledData = filledData?.filter(r => 
        (r.labor_hours && r.labor_hours > 0) ||
        r.system_id !== null ||
        (r.notes && r.notes.trim() !== '')
      ) || [];

      // Build sets of filled indices
      const filledF3Set = new Set<string>();
      const filledF2Set = new Set<string>();

      if (actuallyFilledData && actuallyFilledData.length > 0) {
        // Get f3_index from filled f4_index
        const filledF4Indices = new Set(actuallyFilledData.map(r => r.f4_index));
        
        p4Data?.forEach(p4 => {
          if (filledF4Indices.has(p4.f4_index)) {
            filledF3Set.add(p4.f3_index);
          }
        });

        // Get f2_index from filled f3_index
        p3Data?.forEach(p3 => {
          if (filledF3Set.has(p3.f3_index)) {
            filledF2Set.add(p3.f2_index);
          }
        });
      }

      setFilledF2(filledF2Set);
      setFilledF3(filledF3Set);

      // Build tree structure with Process2 as root
      const tree = (p2Data || []).map(f2 => ({
        f2,
        children3: (p3Data || [])
          .filter(p3 => p3.f2_index === f2.f2_index)
          .filter(p3 => availableF3.has(p3.f3_index))
      })).filter(node => node.children3.length > 0);

      setTreeData(tree);
    } catch (error) {
      console.error('Error loading tree:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (f2Index: string) => {
    const newExpanded = new Set(expanded);
    if (newExpanded.has(f2Index)) {
      newExpanded.delete(f2Index);
    } else {
      newExpanded.add(f2Index);
    }
    setExpanded(newExpanded);
  };

  const expandAll = () => {
    const allF2Indices = treeData.map(node => node.f2.f2_index);
    setExpanded(new Set(allF2Indices));
  };

  const collapseAll = () => {
    setExpanded(new Set());
  };

  if (loading) {
    return <div className="p-4 text-muted-foreground">Загрузка...</div>;
  }

  return (
    <div className="p-4 space-y-2">
      <div className="flex items-center gap-2 pb-2 border-b">
        <Button
          variant="outline"
          size="sm"
          onClick={expandAll}
          className="text-xs"
        >
          <ChevronsDown className="h-3 w-3 mr-1" />
          Развернуть всё
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={collapseAll}
          className="text-xs"
        >
          <ChevronsUp className="h-3 w-3 mr-1" />
          Свернуть всё
        </Button>
      </div>
      
      <div className="space-y-1">
        {treeData.map((node) => (
          <div key={node.f2.f2_index}>
            <button
              onClick={() => toggleExpand(node.f2.f2_index)}
              className="flex items-start w-full px-2 py-1.5 text-sm rounded-md hover:bg-[hsl(var(--tree-item-hover))] transition-colors"
            >
              {expanded.has(node.f2.f2_index) ? (
                <ChevronDown className="h-4 w-4 mr-1 flex-shrink-0" />
              ) : (
                <ChevronRight className="h-4 w-4 mr-1 flex-shrink-0" />
              )}
              <Folder className={`h-4 w-4 mr-2 flex-shrink-0 ${filledF2.has(node.f2.f2_index) ? 'text-green-700' : 'text-primary'}`} />
              <span className="text-left break-words">{node.f2.f2_name}</span>
            </button>

            {expanded.has(node.f2.f2_index) && (
              <div className="ml-4 space-y-1">
                {node.children3.map((node3) => (
                  <button
                    key={node3.f3_index}
                    onClick={() => onSelectProcess(node3.f3_index)}
                    className={cn(
                      "flex items-start w-full px-2 py-1.5 text-sm rounded-md transition-colors",
                      selectedProcess === node3.f3_index
                        ? "bg-[hsl(var(--tree-item-active))] text-[hsl(var(--tree-item-active-text))] font-medium"
                        : "hover:bg-[hsl(var(--tree-item-hover))]"
                    )}
                  >
                    <FileText className={`h-4 w-4 mr-2 flex-shrink-0 ${filledF3.has(node3.f3_index) ? 'text-green-700' : 'text-blue-500'}`} />
                    <span className="text-left break-words">{node3.f3_name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
