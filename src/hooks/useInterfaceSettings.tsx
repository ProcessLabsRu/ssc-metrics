import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface UiSettings {
  id: string;
  logo_url: string | null;
  header_title: string;
  header_bg_color: string;
  header_text_color: string;
  updated_at: string | null;
  updated_by: string | null;
}

const SETTINGS_ID = '00000000-0000-0000-0000-000000000001';

export const useInterfaceSettings = () => {
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['interface-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ui_settings')
        .select('*')
        .eq('id', SETTINGS_ID)
        .maybeSingle();

      if (error) throw error;
      return data as UiSettings | null;
    },
  });

  const updateSettings = useMutation({
    mutationFn: async (newSettings: Partial<UiSettings>) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('ui_settings')
        .update({
          ...newSettings,
          updated_at: new Date().toISOString(),
          updated_by: user?.id,
        })
        .eq('id', SETTINGS_ID)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interface-settings'] });
      toast.success('Настройки интерфейса успешно обновлены');
    },
    onError: (error: Error) => {
      toast.error(`Ошибка обновления настроек: ${error.message}`);
    },
  });

  const uploadLogo = async (file: File): Promise<string> => {
    // Validate file
    if (file.size > 2 * 1024 * 1024) {
      throw new Error('Файл слишком большой. Максимальный размер: 2MB');
    }

    const allowedTypes = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Неподдерживаемый формат файла. Используйте PNG, JPG, SVG или WEBP');
    }

    // Delete old logo if exists
    if (settings?.logo_url) {
      const oldPath = settings.logo_url.split('/').pop();
      if (oldPath) {
        await supabase.storage.from('logos').remove([oldPath]);
      }
    }

    // Upload new logo
    const fileExt = file.name.split('.').pop();
    const fileName = `logo-${Date.now()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('logos')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('logos')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const deleteLogo = async () => {
    if (!settings?.logo_url) return;

    const fileName = settings.logo_url.split('/').pop();
    if (!fileName) return;

    const { error } = await supabase.storage
      .from('logos')
      .remove([fileName]);

    if (error) throw error;

    await updateSettings.mutateAsync({ logo_url: null });
  };

  return {
    settings,
    isLoading,
    updateSettings,
    uploadLogo,
    deleteLogo,
  };
};
