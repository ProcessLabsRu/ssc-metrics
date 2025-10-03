import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Process4, System, UserResponse } from '@/types/database';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
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

  useEffect(() => {
    loadSystems();
  }, []);

  useEffect(() => {
    if (selectedF3Index) {
      loadResponses();
    } else {
      setRows([]);
    }
  }, [selectedF3Index]);

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

  const updateResponse = async (responseId: number, field: 'system_id' | 'notes', value: any) => {
    try {
      if (responseId === 0) {
        const row = rows.find(r => r.response.id === 0);
        if (!row) return;

        const { data, error } = await supabase
          .from('user_responses')
          .insert({
            user_id: row.response.user_id,
            f4_index: row.response.f4_index,
            system_id: field === 'system_id' ? value : null,
            notes: field === 'notes' ? value : null,
          })
          .select()
          .single();

        if (error) throw error;

        setRows(prev => prev.map(r => 
          r.response.id === 0 && r.process4.f4_index === row.process4.f4_index
            ? { ...r, response: data }
            : r
        ));
      } else {
        const { error } = await supabase
          .from('user_responses')
          .update({ [field]: value })
          .eq('id', responseId);

        if (error) throw error;

        setRows(prev => prev.map(r => 
          r.response.id === responseId
            ? { ...r, response: { ...r.response, [field]: value } }
            : r
        ));
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Ошибка сохранения",
        description: error.message,
      });
    }
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
            <TableHead className="min-w-[200px]">ИТ-система</TableHead>
            <TableHead className="min-w-[300px]">Примечания</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, index) => (
            <TableRow key={row.process4.f4_index} className="hover:bg-[hsl(var(--table-hover))]">
              <TableCell>{index + 1}</TableCell>
              <TableCell className="font-medium">{row.process4.f4_name}</TableCell>
              <TableCell>
                <Select
                  value={row.response.system_id?.toString() || ''}
                  onValueChange={(value) => 
                    updateResponse(row.response.id, 'system_id', value ? parseInt(value) : null)
                  }
                >
                  <SelectTrigger>
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
              <TableCell>
                <Input
                  value={row.response.notes || ''}
                  onChange={(e) => updateResponse(row.response.id, 'notes', e.target.value)}
                  placeholder="Введите примечание"
                  onBlur={(e) => updateResponse(row.response.id, 'notes', e.target.value)}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
