import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useInterfaceSettings } from "@/hooks/useInterfaceSettings";
import { Upload, X, Loader2, Palette, Type, Image as ImageIcon, HelpCircle } from "lucide-react";
import { toast } from "sonner";

const HEADER_THEMES = {
  default: {
    name: 'По умолчанию',
    bg: 'hsl(var(--card))',
    text: 'hsl(var(--foreground))',
  },
  dark: {
    name: 'Темная',
    bg: 'hsl(222, 47%, 11%)',
    text: 'hsl(210, 40%, 98%)',
  },
  blue: {
    name: 'Синяя',
    bg: 'hsl(217, 91%, 60%)',
    text: 'hsl(0, 0%, 100%)',
  },
  green: {
    name: 'Зеленая',
    bg: 'hsl(142, 71%, 45%)',
    text: 'hsl(0, 0%, 100%)',
  },
  purple: {
    name: 'Фиолетовая',
    bg: 'hsl(271, 91%, 65%)',
    text: 'hsl(0, 0%, 100%)',
  },
};

export const InterfaceSettings = () => {
  const { settings, isLoading, updateSettings, uploadLogo, deleteLogo } = useInterfaceSettings();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [headerTitle, setHeaderTitle] = useState(settings?.header_title || 'SSC Metrics');
  const [headerBgColor, setHeaderBgColor] = useState(settings?.header_bg_color || 'hsl(var(--card))');
  const [headerTextColor, setHeaderTextColor] = useState(settings?.header_text_color || 'hsl(var(--foreground))');
  const [helpInstructions, setHelpInstructions] = useState(settings?.help_instructions || '');
  const [logoPreview, setLogoPreview] = useState<string | null>(settings?.logo_url || null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Update local state when settings are loaded
  useState(() => {
    if (settings) {
      setHeaderTitle(settings.header_title);
      setHeaderBgColor(settings.header_bg_color);
      setHeaderTextColor(settings.header_text_color);
      setHelpInstructions(settings.help_instructions || '');
      setLogoPreview(settings.logo_url);
    }
  });

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    try {
      const publicUrl = await uploadLogo(file);
      setLogoPreview(publicUrl);
      await updateSettings.mutateAsync({ logo_url: publicUrl });
      toast.success('Логотип успешно загружен');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setUploadingLogo(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteLogo = async () => {
    try {
      await deleteLogo();
      setLogoPreview(null);
      toast.success('Логотип удален');
    } catch (error: any) {
      toast.error(`Ошибка удаления логотипа: ${error.message}`);
    }
  };

  const handleApplyTheme = (theme: keyof typeof HEADER_THEMES) => {
    setHeaderBgColor(HEADER_THEMES[theme].bg);
    setHeaderTextColor(HEADER_THEMES[theme].text);
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      await updateSettings.mutateAsync({
        header_title: headerTitle,
        header_bg_color: headerBgColor,
        header_text_color: headerTextColor,
        help_instructions: helpInstructions,
      });
      setHasChanges(false);
    } catch (error: any) {
      toast.error(`Ошибка сохранения: ${error.message}`);
    }
  };

  const handleReset = () => {
    setHeaderTitle('SSC Metrics');
    setHeaderBgColor('hsl(var(--card))');
    setHeaderTextColor('hsl(var(--foreground))');
    setHasChanges(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Logo Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Логотип
          </CardTitle>
          <CardDescription>
            Загрузите логотип для отображения в шапке приложения
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col items-center gap-4">
            {/* Logo Preview */}
            <div className="w-32 h-32 border-2 border-dashed rounded-lg flex items-center justify-center bg-muted">
              {uploadingLogo ? (
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              ) : logoPreview ? (
                <img 
                  src={logoPreview} 
                  alt="Logo preview" 
                  className="max-w-full max-h-full object-contain p-2"
                />
              ) : (
                <div className="text-center text-muted-foreground">
                  <Upload className="h-8 w-8 mx-auto mb-2" />
                  <p className="text-sm">Нет логотипа</p>
                </div>
              )}
            </div>

            {/* Upload Button */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingLogo}
              >
                <Upload className="h-4 w-4 mr-2" />
                Загрузить логотип
              </Button>
              
              {logoPreview && (
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={handleDeleteLogo}
                  disabled={uploadingLogo}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
              onChange={handleFileSelect}
              className="hidden"
            />

            <p className="text-xs text-muted-foreground text-center">
              Поддерживаемые форматы: PNG, JPG, SVG, WEBP<br />
              Максимальный размер: 2MB
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Header Title Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Type className="h-5 w-5" />
            Название в Header
          </CardTitle>
          <CardDescription>
            Настройте текст, отображаемый в шапке приложения
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="header-title">Название</Label>
            <Input
              id="header-title"
              value={headerTitle}
              onChange={(e) => {
                setHeaderTitle(e.target.value);
                setHasChanges(true);
              }}
              placeholder="SSC Metrics"
            />
          </div>
        </CardContent>
      </Card>

      {/* Header Styling Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Оформление Header
          </CardTitle>
          <CardDescription>
            Настройте цветовую схему шапки приложения
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bg-color">Цвет фона</Label>
              <div className="flex gap-2">
                <Input
                  id="bg-color"
                  value={headerBgColor}
                  onChange={(e) => {
                    setHeaderBgColor(e.target.value);
                    setHasChanges(true);
                  }}
                  placeholder="hsl(var(--card))"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="text-color">Цвет текста</Label>
              <div className="flex gap-2">
                <Input
                  id="text-color"
                  value={headerTextColor}
                  onChange={(e) => {
                    setHeaderTextColor(e.target.value);
                    setHasChanges(true);
                  }}
                  placeholder="hsl(var(--foreground))"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Готовые темы</Label>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {Object.entries(HEADER_THEMES).map(([key, theme]) => (
                <Button
                  key={key}
                  variant="outline"
                  size="sm"
                  onClick={() => handleApplyTheme(key as keyof typeof HEADER_THEMES)}
                  className="justify-start"
                >
                  <div
                    className="w-4 h-4 rounded mr-2"
                    style={{ backgroundColor: theme.bg }}
                  />
                  {theme.name}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Help Instructions Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            Инструкция для пользователей
          </CardTitle>
          <CardDescription>
            Текст инструкции, который будет отображаться при нажатии на кнопку помощи
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="help-instructions">Текст инструкции</Label>
            <Textarea
              id="help-instructions"
              value={helpInstructions}
              onChange={(e) => {
                setHelpInstructions(e.target.value);
                setHasChanges(true);
              }}
              placeholder="Введите инструкцию по работе с системой..."
              rows={10}
              className="resize-y"
            />
            <p className="text-xs text-muted-foreground">
              Если инструкция не заполнена, кнопка помощи не будет отображаться
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Preview Section */}
      <Card>
        <CardHeader>
          <CardTitle>Превью Header</CardTitle>
          <CardDescription>
            Предварительный просмотр изменений
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className="border rounded-lg p-4"
            style={{
              backgroundColor: headerBgColor,
              color: headerTextColor,
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {logoPreview ? (
                  <img 
                    src={logoPreview} 
                    alt="Logo" 
                    className="w-12 h-12 object-contain rounded-lg"
                  />
                ) : (
                  <div 
                    className="w-12 h-12 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${headerBgColor}dd` }}
                  >
                    <span className="text-xl font-bold">Л</span>
                  </div>
                )}
                <h1 className="text-xl font-bold">{headerTitle}</h1>
              </div>
              <div className="text-sm opacity-70">Профиль</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-2 justify-end">
        <Button
          variant="outline"
          onClick={handleReset}
          disabled={updateSettings.isPending}
        >
          Сбросить
        </Button>
        <Button
          onClick={handleSave}
          disabled={!hasChanges || updateSettings.isPending}
        >
          {updateSettings.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Сохранение...
            </>
          ) : (
            'Сохранить изменения'
          )}
        </Button>
      </div>
    </div>
  );
};
