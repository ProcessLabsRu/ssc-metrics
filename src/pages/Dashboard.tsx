import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { ProcessTree } from '@/components/ProcessTree';
import { ResponsesTable } from '@/components/ResponsesTable';
import { Header } from '@/components/Header';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';

const Dashboard = () => {
  const { user, isAdmin, userProfile, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [selectedF3Index, setSelectedF3Index] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <Header 
        userProfile={userProfile} 
        isAdmin={isAdmin} 
        onSignOut={signOut} 
      />

      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel defaultSize={25} minSize={20} maxSize={40}>
            <div className="h-full border-r bg-card overflow-auto">
              <div className="p-4 border-b">
                <h2 className="font-semibold">Иерархия процессов</h2>
              </div>
              <ProcessTree
                onSelectProcess={setSelectedF3Index}
                selectedProcess={selectedF3Index}
                refreshTrigger={refreshTrigger}
              />
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel defaultSize={75}>
            <div className="h-full bg-background">
              <div className="p-4 border-b bg-card">
                <h2 className="font-semibold">Данные по процессам 4 уровня</h2>
              </div>
              <div className="h-[calc(100%-4rem)]">
                <ResponsesTable 
                  selectedF3Index={selectedF3Index} 
                  onDataChange={() => setRefreshTrigger(prev => prev + 1)}
                />
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
};

export default Dashboard;
