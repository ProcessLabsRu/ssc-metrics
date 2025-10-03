import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Process4, System, UserResponse } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface ResponsesTableProps {
  selectedF3Index: string | null;
}

interface ResponseRow {
  response: UserResponse;
  process4: Process4;
}

export const ResponsesTable = ({ selectedF3Index }: ResponsesTableProps) => {
  const [rows, setRows] = useState<ResponseRow[]>([]);
  const [systems, setSystems] = useState<System[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const pendingChangesRef = useRef<Map<number, { field: string; value: any }[]>>(new Map());
  const saveTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    loadSystems();
  }, []);

  useEffect(() => {
    // Save pending changes before switching process
    if (pendingChangesRef.current.size > 0) {
      savePendingChanges();
    }
    
    if (selectedF3Index) {
      loadResponses();
    } else {
      setRows([]);
    }
  }, [selectedF3Index]);

  // Auto-save with debounce
  useEffect(() => {
    if (pendingChangesRef.current.size > 0) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        savePendingChanges();
      }, 1000);
    }

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [rows]);

  // Save on page unload
  useEffect(() => {
    const handleBeforeUnload = async () => {
      if (pendingChangesRef.current.size > 0) {
        await savePendingChanges();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  const loadSystems = async () => {
    const { data } = await supabase
      .from('systems')
      .select('*')
      .eq('is_active', true)
      .order('system_name');
    
    setSystems(data || []);
  };

  const loadResponses = async () => {
    if (!selectedF3Index) return;
    
    setLoading(true);
    try {
      const { data: p4Data } = await supabase
        .from('process_4')
        .select('*')
        .eq('f3_index', selectedF3Index)
        .order('sort');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: responsesData } = await supabase
        .from('user_responses')
        .select('*')
        .eq('user_id', user.id)
        .in('f4_index', (p4Data || []).map(p => p.f4_index));

      const combined: ResponseRow[] = (p4Data || []).map(p4 => {
        const response = (responsesData || []).find(r => r.f4_index === p4.f4_index);
        return {
          process4: p4,
          response: response || {
            id: 0,
            user_id: user.id,
            f4_index: p4.f4_index,
            system_id: null,
            notes: null,
            labor_hours: 0,
            created_at: new Date().toISOString(),
          },
        };
      });

      setRows(combined);
    } catch (error) {
      console.error('Error loading responses:', error);
    } finally {
      setLoading(false);
    }
  };

  const savePendingChanges = async () => {
    const changes = Array.from(pendingChangesRef.current.entries());
    pendingChangesRef.current.clear();

    for (const [responseId, fields] of changes) {
      try {
        if (responseId === 0) {
          const row = rows.find(r => r.response.id === 0);
          if (!row) continue;

          const updateData: any = {
            user_id: row.response.user_id,
            f4_index: row.response.f4_index,
            system_id: null,
            notes: null,
            labor_hours: 0,
          };

          fields.forEach(({ field, value }) => {
            updateData[field] = value;
          });

          const { data, error } = await supabase
            .from('user_responses')
            .insert(updateData)
            .select()
            .single();

          if (error) throw error;

          setRows(prev => prev.map(r => 
            r.response.id === 0 && r.process4.f4_index === row.process4.f4_index
              ? { ...r, response: data }
              : r
          ));
        } else {
          const updateData: any = {};
          fields.forEach(({ field, value }) => {
            updateData[field] = value;
          });

          const { error } = await supabase
            .from('user_responses')
            .update(updateData)
            .eq('id', responseId);

          if (error) throw error;
        }
      } catch (error: any) {
        toast({
          variant: "destructive",
          title: "Ошибка сохранения",
          description: error.message,
        });
      }
    }
  };

  const updateResponse = (responseId: number, field: 'system_id' | 'notes' | 'labor_hours', value: any) => {
    // Validate labor_hours
    if (field === 'labor_hours') {
      const numValue = parseFloat(value);
      if (isNaN(numValue) || numValue < 0 || numValue > 250) {
        toast({
          variant: "destructive",
          title: "Ошибка валидации",
          description: "Трудоемкость должна быть от 0 до 250 часов",
        });
        return;
      }
      value = numValue;
    }

    // Update local state immediately
    setRows(prev => prev.map(r => 
      r.response.id === responseId
        ? { ...r, response: { ...r.response, [field]: value } }
        : r
    ));

    // Add to pending changes
    const changes = pendingChangesRef.current.get(responseId) || [];
    const existingIndex = changes.findIndex(c => c.field === field);
    if (existingIndex >= 0) {
      changes[existingIndex].value = value;
    } else {
      changes.push({ field, value });
    }
    pendingChangesRef.current.set(responseId, changes);
  };

  if (!selectedF3Index) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Выберите процесс 3 уровня из дерева
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Загрузка...
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      <Table>
        <TableHeader className="sticky top-0 bg-[hsl(var(--table-header))] z-10">
          <TableRow>
            <TableHead className="w-[50px]">№</TableHead>
            <TableHead className="min-w-[300px]">Процесс 4 уровня</TableHead>
            <TableHead className="w-[200px]">ИТ-система</TableHead>
            <TableHead className="w-[120px]">Трудоемкость (часы)</TableHead>
            <TableHead className="min-w-[300px]">Примечания</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, index) => (
            <TableRow key={row.process4.f4_index}>
              <TableCell>{index + 1}</TableCell>
              <TableCell className="font-medium">{row.process4.f4_name}</TableCell>
              <TableCell className="p-0">
                <Select
                  value={row.response.system_id?.toString() || ''}
                  onValueChange={(value) => 
                    updateResponse(row.response.id, 'system_id', value ? parseInt(value) : null)
                  }
                >
                  <SelectTrigger className="w-full h-full border-0 rounded-none bg-transparent hover:bg-accent/30 focus:bg-accent/50 text-sm shadow-none">
                    <SelectValue placeholder="Выберите систему" />
                  </SelectTrigger>
                  <SelectContent>
                    {systems.map((system) => (
                      <SelectItem key={system.system_id} value={system.system_id.toString()}>
                        {system.system_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell className="p-0">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="250"
                  value={row.response.labor_hours ?? 0}
                  onChange={(e) => updateResponse(row.response.id, 'labor_hours', e.target.value)}
                  className="w-full h-full border-0 rounded-none bg-transparent hover:bg-accent/30 focus-visible:bg-accent/50 focus-visible:outline-none text-sm px-2 py-2"
                />
              </TableCell>
              <TableCell className="p-0">
                <input
                  type="text"
                  value={row.response.notes || ''}
                  onChange={(e) => updateResponse(row.response.id, 'notes', e.target.value)}
                  placeholder="Введите примечание"
                  className="w-full h-full border-0 rounded-none bg-transparent hover:bg-accent/30 focus-visible:bg-accent/50 focus-visible:outline-none text-sm px-2 py-2"
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
