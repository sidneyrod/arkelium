import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import PageHeader from '@/components/ui/page-header';
import SearchInput from '@/components/ui/search-input';
import DataTable, { Column } from '@/components/ui/data-table';
import StatusBadge from '@/components/ui/status-badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FilePlus, MapPin, Clock, DollarSign, CheckSquare, History } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Contract {
  id: string;
  clientName: string;
  location: string;
  frequency: 'weekly' | 'biweekly' | 'monthly' | 'oneTime';
  services: string[];
  status: 'active' | 'pending' | 'completed' | 'cancelled';
  value: number;
  avgDuration: string;
  startDate: string;
}

const mockContracts: Contract[] = [
  { id: '1', clientName: 'Sarah Mitchell', location: '245 Oak Street', frequency: 'weekly', services: ['Deep Clean', 'Kitchen', 'Bathrooms'], status: 'active', value: 180, avgDuration: '3h', startDate: '2024-01-15' },
  { id: '2', clientName: 'Thompson Corp', location: '890 Business Ave', frequency: 'biweekly', services: ['Office Clean', 'Windows', 'Floors'], status: 'active', value: 450, avgDuration: '6h', startDate: '2024-02-01' },
  { id: '3', clientName: 'Emily Chen', location: '112 Maple Drive', frequency: 'monthly', services: ['Standard Clean'], status: 'active', value: 120, avgDuration: '2h', startDate: '2024-03-10' },
  { id: '4', clientName: 'Metro Office', location: '456 Tower Blvd', frequency: 'weekly', services: ['Daily Clean', 'Sanitization'], status: 'pending', value: 850, avgDuration: '8h', startDate: '2024-06-01' },
  { id: '5', clientName: 'Robert Johnson', location: '78 Pine Avenue', frequency: 'oneTime', services: ['Move-out Clean'], status: 'completed', value: 350, avgDuration: '5h', startDate: '2024-05-20' },
];

const frequencyColors: Record<string, string> = {
  weekly: 'bg-primary/10 text-primary',
  biweekly: 'bg-info/10 text-info',
  monthly: 'bg-success/10 text-success',
  oneTime: 'bg-warning/10 text-warning',
};

const Contracts = () => {
  const { t } = useLanguage();
  const [search, setSearch] = useState('');
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);

  const filteredContracts = mockContracts.filter(contract =>
    contract.clientName.toLowerCase().includes(search.toLowerCase()) ||
    contract.location.toLowerCase().includes(search.toLowerCase())
  );

  const columns: Column<Contract>[] = [
    {
      key: 'clientName',
      header: t.contracts.client,
      render: (contract) => (
        <div>
          <p className="font-medium">{contract.clientName}</p>
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {contract.location}
          </p>
        </div>
      ),
    },
    {
      key: 'frequency',
      header: t.contracts.frequency,
      render: (contract) => (
        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${frequencyColors[contract.frequency]}`}>
          {t.contracts[contract.frequency]}
        </span>
      ),
    },
    {
      key: 'services',
      header: t.contracts.services,
      render: (contract) => (
        <div className="flex flex-wrap gap-1">
          {contract.services.slice(0, 2).map((service, i) => (
            <Badge key={i} variant="secondary" className="text-xs">{service}</Badge>
          ))}
          {contract.services.length > 2 && (
            <Badge variant="secondary" className="text-xs">+{contract.services.length - 2}</Badge>
          )}
        </div>
      ),
    },
    {
      key: 'value',
      header: t.contracts.value,
      render: (contract) => (
        <span className="font-medium">${contract.value}</span>
      ),
    },
    {
      key: 'status',
      header: t.contracts.status,
      render: (contract) => (
        <StatusBadge status={contract.status} />
      ),
    },
  ];

  return (
    <div className="container px-4 py-8 lg:px-8 space-y-6">
      <PageHeader 
        title={t.contracts.title}
        description="Manage service contracts and agreements"
        action={{
          label: t.contracts.addContract,
          icon: FilePlus,
          onClick: () => console.log('Add contract'),
        }}
      />

      <SearchInput 
        placeholder="Search contracts..."
        value={search}
        onChange={setSearch}
        className="max-w-sm"
      />

      <DataTable 
        columns={columns}
        data={filteredContracts}
        onRowClick={setSelectedContract}
        emptyMessage={t.common.noData}
      />

      {/* Contract Details Dialog */}
      <Dialog open={!!selectedContract} onOpenChange={() => setSelectedContract(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Contract Details</DialogTitle>
          </DialogHeader>
          
          {selectedContract && (
            <div className="space-y-6 mt-4">
              {/* Contract Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold">{selectedContract.clientName}</h3>
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {selectedContract.location}
                  </p>
                </div>
                <StatusBadge status={selectedContract.status} />
              </div>

              {/* Stats */}
              <div className="grid gap-4 sm:grid-cols-3">
                <Card className="border-border/50">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <DollarSign className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">{t.contracts.value}</p>
                        <p className="text-xl font-semibold">${selectedContract.value}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border/50">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-info/10 flex items-center justify-center">
                        <Clock className="h-5 w-5 text-info" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">{t.contracts.duration}</p>
                        <p className="text-xl font-semibold">{selectedContract.avgDuration}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border/50">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${frequencyColors[selectedContract.frequency]}`}>
                        <History className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">{t.contracts.frequency}</p>
                        <p className="text-xl font-semibold capitalize">{t.contracts[selectedContract.frequency]}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Services */}
              <Card className="border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <CheckSquare className="h-4 w-4 text-primary" />
                    {t.contracts.services}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {selectedContract.services.map((service, i) => (
                      <Badge key={i} variant="secondary">{service}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Contracts;
