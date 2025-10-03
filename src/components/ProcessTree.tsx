import { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, Folder, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Process1, Process2, Process3 } from '@/types/database';
import { cn } from '@/lib/utils';

interface ProcessTreeProps {
  onSelectProcess: (f3Index: string | null) => void;
  selectedProcess: string | null;
}

interface TreeNode {
  f1: Process1;
  children2: Array<{
    f2: Process2;
    children3: Process3[];
  }>;
}

export const ProcessTree = ({ onSelectProcess, selectedProcess }: ProcessTreeProps) => {
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [expanded1, setExpanded1] = useState<Set<string>>(new Set());
  const [expanded2, setExpanded2] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTreeData();
  }, []);

  const loadTreeData = async () => {
    try {
      const { data: userAccess } = await supabase
        .from('user_access')
        .select('f1_index');

      const accessibleF1 = userAccess?.map(a => a.f1_index) || [];

      const { data: p1Data } = await supabase
        .from('process_1')
        .select('*')
        .in('f1_index', accessibleF1)
        .order('sort');

      const { data: p2Data } = await supabase
        .from('process_2')
        .select('*')
        .order('sort');

      const { data: p3Data } = await supabase
        .from('process_3')
        .select('*')
        .order('sort');

      const tree: TreeNode[] = (p1Data || []).map(f1 => {
        const level2 = (p2Data || []).filter(f2 => f2.f1_index === f1.f1_index);
        
        return {
          f1,
          children2: level2.map(f2 => ({
            f2,
            children3: (p3Data || []).filter(f3 => f3.f2_index === f2.f2_index),
          })),
        };
      });

      setTreeData(tree);
    } catch (error) {
      console.error('Error loading tree:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand1 = (f1Index: string) => {
    const newExpanded = new Set(expanded1);
    if (newExpanded.has(f1Index)) {
      newExpanded.delete(f1Index);
    } else {
      newExpanded.add(f1Index);
    }
    setExpanded1(newExpanded);
  };

  const toggleExpand2 = (f2Index: string) => {
    const newExpanded = new Set(expanded2);
    if (newExpanded.has(f2Index)) {
      newExpanded.delete(f2Index);
    } else {
      newExpanded.add(f2Index);
    }
    setExpanded2(newExpanded);
  };

  if (loading) {
    return <div className="p-4 text-muted-foreground">Загрузка...</div>;
  }

  return (
    <div className="p-4 space-y-1">
      {treeData.map((node1) => (
        <div key={node1.f1.f1_index}>
          <button
            onClick={() => toggleExpand1(node1.f1.f1_index)}
            className="flex items-center w-full px-2 py-1.5 text-sm rounded-md hover:bg-[hsl(var(--tree-item-hover))] transition-colors"
          >
            {expanded1.has(node1.f1.f1_index) ? (
              <ChevronDown className="h-4 w-4 mr-1 flex-shrink-0" />
            ) : (
              <ChevronRight className="h-4 w-4 mr-1 flex-shrink-0" />
            )}
            <Folder className="h-4 w-4 mr-2 flex-shrink-0 text-primary" />
            <span className="truncate">{node1.f1.f1_name}</span>
          </button>

          {expanded1.has(node1.f1.f1_index) && (
            <div className="ml-4 space-y-1">
              {node1.children2.map((node2) => (
                <div key={node2.f2.f2_index}>
                  <button
                    onClick={() => toggleExpand2(node2.f2.f2_index)}
                    className="flex items-center w-full px-2 py-1.5 text-sm rounded-md hover:bg-[hsl(var(--tree-item-hover))] transition-colors"
                  >
                    {expanded2.has(node2.f2.f2_index) ? (
                      <ChevronDown className="h-4 w-4 mr-1 flex-shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 mr-1 flex-shrink-0" />
                    )}
                    <Folder className="h-4 w-4 mr-2 flex-shrink-0 text-primary" />
                    <span className="truncate">{node2.f2.f2_name}</span>
                  </button>

                  {expanded2.has(node2.f2.f2_index) && (
                    <div className="ml-4 space-y-1">
                      {node2.children3.map((node3) => (
                        <button
                          key={node3.f3_index}
                          onClick={() => onSelectProcess(node3.f3_index)}
                          className={cn(
                            "flex items-center w-full px-2 py-1.5 text-sm rounded-md transition-colors",
                            selectedProcess === node3.f3_index
                              ? "bg-[hsl(var(--tree-item-active))] text-[hsl(var(--tree-item-active-text))] font-medium"
                              : "hover:bg-[hsl(var(--tree-item-hover))]"
                          )}
                        >
                          <FileText className="h-4 w-4 mr-2 flex-shrink-0 text-blue-500" />
                          <span className="truncate">{node3.f3_name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
