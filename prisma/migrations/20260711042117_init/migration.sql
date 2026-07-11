-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "mustChangePass" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" TIMESTAMP(3),
    "failedAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "action" TEXT NOT NULL,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRole" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "oldValues" JSONB,
    "newValues" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyConfig" (
    "id" TEXT NOT NULL,
    "razaoSocial" TEXT NOT NULL,
    "nomeFantasia" TEXT,
    "cnpj" TEXT NOT NULL,
    "porte" TEXT,
    "regimeTributario" TEXT NOT NULL DEFAULT 'Simples Nacional',
    "cnaePrincipal" TEXT,
    "inscMunicipal" TEXT,
    "logradouro" TEXT,
    "bairro" TEXT,
    "municipio" TEXT,
    "uf" TEXT,
    "cep" TEXT,
    "email" TEXT,
    "telefone" TEXT,
    "aliqISS" DECIMAL(5,2) NOT NULL DEFAULT 5.00,
    "aliqINSS" DECIMAL(5,2) NOT NULL DEFAULT 7.00,
    "aliqIRRF" DECIMAL(5,2) NOT NULL DEFAULT 1.50,
    "aliqFGTS" DECIMAL(5,2) NOT NULL DEFAULT 8.00,
    "aliqDAS" DECIMAL(5,2) NOT NULL DEFAULT 6.72,
    "nomeContador" TEXT,
    "emailContador" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cnpjCpf" TEXT,
    "type" TEXT NOT NULL DEFAULT 'juridica',
    "category" TEXT NOT NULL DEFAULT 'Público',
    "email" TEXT,
    "phone" TEXT,
    "contact" TEXT,
    "logradouro" TEXT,
    "municipio" TEXT,
    "uf" TEXT,
    "cep" TEXT,
    "situacao" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cnpj" TEXT,
    "type" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "municipio" TEXT,
    "uf" TEXT,
    "situacao" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "cpf" TEXT,
    "admissionDate" TIMESTAMP(3) NOT NULL,
    "salary" DECIMAL(15,2) NOT NULL,
    "bank" TEXT,
    "bankAgency" TEXT,
    "bankAccount" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ativo',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeDoc" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "docType" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "filePath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeDoc_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Proposal" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "clientId" TEXT,
    "serviceType" TEXT,
    "object" TEXT,
    "location" TEXT,
    "area" DECIMAL(15,3),
    "unit" TEXT,
    "days" INTEGER,
    "workers" INTEGER,
    "chargesRate" DECIMAL(5,2) NOT NULL DEFAULT 70,
    "adminRate" DECIMAL(5,2) NOT NULL DEFAULT 10,
    "riskRate" DECIMAL(5,2) NOT NULL DEFAULT 5,
    "taxRate" DECIMAL(5,2) NOT NULL DEFAULT 8,
    "marginRate" DECIMAL(5,2) NOT NULL DEFAULT 30,
    "totalValue" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "validityDays" INTEGER NOT NULL DEFAULT 30,
    "paymentTerms" TEXT,
    "technicalNotes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Aberta',
    "approvedAt" TIMESTAMP(3),
    "pdfPath" TEXT,
    "modelo" TEXT NOT NULL DEFAULT 'simples',
    "vigenciaMeses" INTEGER,
    "premissas" JSONB,
    "condicoesComerciais" JSONB,
    "bdiEquipes" JSONB,
    "bdiSpot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Proposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProposalItem" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "grupo" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "unidade" TEXT NOT NULL DEFAULT 'vb',
    "quantidade" DECIMAL(15,3) NOT NULL DEFAULT 1,
    "valorUnitario" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProposalItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProposalTeam" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "colaboradores" INTEGER NOT NULL DEFAULT 1,
    "meses" INTEGER NOT NULL DEFAULT 12,
    "bdiRate" DECIMAL(5,2) NOT NULL DEFAULT 28,
    "componentes" JSONB NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProposalTeam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpenseCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'operacional',
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ExpenseCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'em_aberto',
    "categoryId" TEXT,
    "supplierId" TEXT,
    "competence" TEXT,
    "receiptPath" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FiscalTaxExpense" (
    "id" TEXT NOT NULL,
    "taxType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "competence" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paymentDate" TIMESTAMP(3),
    "principalAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "penaltyAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "interestAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'em_aberto',
    "revenueCode" TEXT,
    "generatedAuto" BOOLEAN NOT NULL DEFAULT false,
    "attachmentPath" TEXT,
    "accountantReviewed" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FiscalTaxExpense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FiscalNfe" (
    "id" TEXT NOT NULL,
    "accessKey" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "series" TEXT,
    "issueDate" TIMESTAMP(3) NOT NULL,
    "entryDate" TIMESTAMP(3),
    "supplierId" TEXT,
    "supplierName" TEXT,
    "supplierCnpj" TEXT,
    "totalAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "pisAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "cofinsAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'importada',
    "xmlPath" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FiscalNfe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FiscalNfse" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "municipality" TEXT NOT NULL,
    "providerCnpj" TEXT NOT NULL,
    "receiverName" TEXT,
    "receiverCnpj" TEXT,
    "clientId" TEXT,
    "serviceCode" TEXT,
    "description" TEXT NOT NULL,
    "serviceValue" DECIMAL(15,2) NOT NULL,
    "calculationBase" DECIMAL(15,2) NOT NULL,
    "issRate" DECIMAL(5,2) NOT NULL,
    "issAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "issRetained" BOOLEAN NOT NULL DEFAULT false,
    "netAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "issueDate" TIMESTAMP(3) NOT NULL,
    "competence" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'lancada',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FiscalNfse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FiscalSimplesDas" (
    "id" TEXT NOT NULL,
    "competence" TEXT NOT NULL,
    "grossRevenue" DECIMAL(15,2) NOT NULL,
    "accumulatedRevenue12" DECIMAL(15,2) NOT NULL,
    "effectiveRate" DECIMAL(5,4) NOT NULL,
    "dasAmount" DECIMAL(15,2) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paymentDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'em_aberto',
    "accountantReviewed" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FiscalSimplesDas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FiscalLaborCharge" (
    "id" TEXT NOT NULL,
    "competence" TEXT NOT NULL,
    "employeeId" TEXT,
    "employeeName" TEXT,
    "eventType" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paymentDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'em_aberto',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FiscalLaborCharge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FiscalDocument" (
    "id" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "issuer" TEXT,
    "number" TEXT,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'regular',
    "responsible" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FiscalDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FiscalObligation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "obligationType" TEXT NOT NULL,
    "competence" TEXT,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "responsible" TEXT,
    "status" TEXT NOT NULL DEFAULT 'prevista',
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FiscalObligation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "color" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "InventoryCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL,
    "internalCode" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "itemType" TEXT NOT NULL DEFAULT 'consumivel',
    "brand" TEXT,
    "unit" TEXT NOT NULL,
    "currentQuantity" DECIMAL(15,3) NOT NULL DEFAULT 0,
    "minimumStock" DECIMAL(15,3) NOT NULL DEFAULT 0,
    "location" TEXT,
    "averageCost" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "isEpi" BOOLEAN NOT NULL DEFAULT false,
    "isTool" BOOLEAN NOT NULL DEFAULT false,
    "isPatrimony" BOOLEAN NOT NULL DEFAULT false,
    "patrimonyNumber" TEXT,
    "serialNumber" TEXT,
    "status" TEXT NOT NULL DEFAULT 'regular',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryMovement" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "movementType" TEXT NOT NULL,
    "quantity" DECIMAL(15,3) NOT NULL,
    "unitCost" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "movementDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "employeeId" TEXT,
    "reason" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Integration" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "environment" TEXT NOT NULL DEFAULT 'homologacao',
    "status" TEXT NOT NULL DEFAULT 'pendente_config',
    "requiresAuth" BOOLEAN NOT NULL DEFAULT false,
    "requiresCertificate" BOOLEAN NOT NULL DEFAULT false,
    "requiresPaidApi" BOOLEAN NOT NULL DEFAULT false,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "baseUrl" TEXT,
    "description" TEXT,
    "lastRunAt" TIMESTAMP(3),
    "lastErrorMessage" TEXT,
    "totalCalls" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Integration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationLog" (
    "id" TEXT NOT NULL,
    "integrationId" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "httpStatus" INTEGER,
    "durationMs" INTEGER,
    "responseSummary" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntegrationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationCache" (
    "id" TEXT NOT NULL,
    "cacheKey" TEXT NOT NULL,
    "integrationSlug" TEXT NOT NULL,
    "dataJson" TEXT NOT NULL,
    "hitsCount" INTEGER NOT NULL DEFAULT 0,
    "cachedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrationCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contract" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "clientId" TEXT,
    "object" TEXT NOT NULL,
    "value" DECIMAL(15,2) NOT NULL,
    "monthlyValue" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Ativo',
    "renewalAlertDays" INTEGER NOT NULL DEFAULT 90,
    "adjustIndex" TEXT NOT NULL DEFAULT 'INPC',
    "signedPath" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "plate" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'Pickup',
    "year" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FuelLog" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "contractId" TEXT,
    "employeeId" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "odometer" INTEGER NOT NULL,
    "liters" DECIMAL(10,2) NOT NULL,
    "pricePerLiter" DECIMAL(10,3) NOT NULL,
    "totalCost" DECIMAL(15,2) NOT NULL,
    "fuelType" TEXT NOT NULL DEFAULT 'Gasolina',
    "station" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FuelLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Training" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "trainingType" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "institution" TEXT,
    "certificatePath" TEXT,
    "status" TEXT NOT NULL DEFAULT 'valido',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Training_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Measurement" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "value" DECIMAL(15,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'em_elaboracao',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "notes" TEXT,
    "pdfPath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Measurement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeasurementItem" (
    "id" TEXT NOT NULL,
    "measurementId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "quantity" DECIMAL(15,3) NOT NULL,
    "unitValue" DECIMAL(15,2) NOT NULL,
    "totalValue" DECIMAL(15,2) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MeasurementItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkDiary" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contractId" TEXT,
    "location" TEXT NOT NULL,
    "supervisor" TEXT NOT NULL,
    "teamSize" INTEGER NOT NULL DEFAULT 1,
    "weather" TEXT NOT NULL DEFAULT 'Bom',
    "activitiesDone" TEXT NOT NULL,
    "areasWorked" TEXT,
    "equipmentUsed" TEXT,
    "occurrences" TEXT,
    "photosPaths" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkDiary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryEpiDelivery" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "deliveryDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expectedReplacementDate" TIMESTAMP(3),
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "caNumber" TEXT,
    "caExpirationDate" TIMESTAMP(3),
    "reason" TEXT DEFAULT 'Dotação periódica',
    "status" TEXT NOT NULL DEFAULT 'ativo',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryEpiDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mobilization" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "hoursDay" INTEGER NOT NULL DEFAULT 8,
    "daysWeek" INTEGER NOT NULL DEFAULT 5,
    "costPerMonth" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ativa',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Mobilization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServicePhoto" (
    "id" TEXT NOT NULL,
    "workDiaryId" TEXT,
    "contractId" TEXT,
    "tipo" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "descricao" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "tamanhoKb" INTEGER,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServicePhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientPortalToken" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientPortalToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Equipment" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "marca" TEXT,
    "modelo" TEXT,
    "anoFabricacao" INTEGER,
    "numeroProprio" TEXT,
    "status" TEXT NOT NULL DEFAULT 'operacional',
    "localAtual" TEXT,
    "contratoId" TEXT,
    "valorAquisicao" DECIMAL(15,2),
    "dataAquisicao" TIMESTAMP(3),
    "vidaUtilMeses" INTEGER,
    "horasUso" INTEGER NOT NULL DEFAULT 0,
    "proximaRevisao" TIMESTAMP(3),
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EquipmentMaintenance" (
    "id" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "dataRealizada" TIMESTAMP(3),
    "dataAgendada" TIMESTAMP(3) NOT NULL,
    "custo" DECIMAL(15,2),
    "fornecedor" TEXT,
    "status" TEXT NOT NULL DEFAULT 'agendada',
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EquipmentMaintenance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BidPipeline" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "orgao" TEXT NOT NULL,
    "editalNumero" TEXT,
    "objeto" TEXT NOT NULL,
    "valorEstimado" DECIMAL(15,2),
    "dataAbertura" TIMESTAMP(3),
    "dataLimite" TIMESTAMP(3),
    "modalidade" TEXT,
    "stage" TEXT NOT NULL DEFAULT 'monitorando',
    "prioridade" TEXT NOT NULL DEFAULT 'media',
    "probabilidade" INTEGER NOT NULL DEFAULT 50,
    "municipio" TEXT,
    "uf" TEXT,
    "url" TEXT,
    "pncpId" TEXT,
    "proposalId" TEXT,
    "contratoId" TEXT,
    "responsavel" TEXT,
    "notas" TEXT,
    "perdaMotivo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BidPipeline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RetroJob" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "clienteNome" TEXT NOT NULL,
    "clienteId" TEXT,
    "tipoServico" TEXT NOT NULL,
    "endereco" TEXT,
    "municipio" TEXT,
    "uf" TEXT,
    "contratoId" TEXT,
    "areaM2" DECIMAL(15,2),
    "volumeM3" DECIMAL(15,2),
    "horasEstimadas" DECIMAL(8,2),
    "horasRealizadas" DECIMAL(8,2),
    "distanciaKm" DECIMAL(8,2),
    "dataInicio" TIMESTAMP(3),
    "dataFim" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'orcamento',
    "custoTotal" DECIMAL(15,2),
    "valorCobrado" DECIMAL(15,2),
    "margemReal" DECIMAL(5,2),
    "precoMinimo" DECIMAL(15,2),
    "precoIdeal" DECIMAL(15,2),
    "viavel" BOOLEAN NOT NULL DEFAULT true,
    "observacoes" TEXT,
    "artNumero" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RetroJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RetroJobDespesa" (
    "id" TEXT NOT NULL,
    "retroJobId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "valor" DECIMAL(15,2) NOT NULL,
    "unidade" TEXT NOT NULL DEFAULT 'vb',
    "quantidade" DECIMAL(10,3) NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RetroJobDespesa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RetroConfig" (
    "id" TEXT NOT NULL,
    "custoHoraCombustivel" DECIMAL(10,2) NOT NULL DEFAULT 45,
    "custoHoraOperador" DECIMAL(10,2) NOT NULL DEFAULT 32,
    "custoHoraDepreciacao" DECIMAL(10,2) NOT NULL DEFAULT 28,
    "custoHoraManutencao" DECIMAL(10,2) NOT NULL DEFAULT 15,
    "custoHoraSeguro" DECIMAL(10,2) NOT NULL DEFAULT 8,
    "custoKmTransporte" DECIMAL(10,2) NOT NULL DEFAULT 8,
    "margemAlvo" DECIMAL(5,2) NOT NULL DEFAULT 25,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RetroConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DedetJob" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "clienteNome" TEXT NOT NULL,
    "clienteId" TEXT,
    "tipoServico" TEXT NOT NULL,
    "endereco" TEXT NOT NULL,
    "municipio" TEXT,
    "uf" TEXT,
    "areaM2" DECIMAL(15,2),
    "ambientes" TEXT,
    "infestacaoNivel" TEXT NOT NULL DEFAULT 'leve',
    "dataAplicacao" TIMESTAMP(3),
    "dataRetorno" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'orcamento',
    "valorCobrado" DECIMAL(15,2),
    "custoTotal" DECIMAL(15,2),
    "tecnicoId" TEXT,
    "tecnicoNome" TEXT,
    "artNumero" TEXT,
    "certificadoEmitido" BOOLEAN NOT NULL DEFAULT false,
    "certificadoDataVal" TIMESTAMP(3),
    "observacoes" TEXT,
    "garantiaDias" INTEGER NOT NULL DEFAULT 90,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DedetJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DedetProduto" (
    "id" TEXT NOT NULL,
    "dedetJobId" TEXT NOT NULL,
    "nomeComercial" TEXT NOT NULL,
    "principioAtivo" TEXT NOT NULL,
    "registroAnvisa" TEXT,
    "concentracao" TEXT,
    "dosagemUsada" TEXT,
    "quantidadeL" DECIMAL(8,3) NOT NULL,
    "custoUnitario" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DedetProduto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DedetProdutoCatalogo" (
    "id" TEXT NOT NULL,
    "nomeComercial" TEXT NOT NULL,
    "principioAtivo" TEXT NOT NULL,
    "registroAnvisa" TEXT NOT NULL,
    "fabricante" TEXT,
    "tipo" TEXT NOT NULL,
    "alvosPrincipais" TEXT NOT NULL,
    "concentracao" TEXT,
    "custoLitro" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DedetProdutoCatalogo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "categoria" TEXT NOT NULL,
    "subcategoria" TEXT,
    "tags" TEXT,
    "clienteId" TEXT,
    "contratoId" TEXT,
    "funcionarioId" TEXT,
    "estrategia" TEXT NOT NULL DEFAULT 'url',
    "urlArquivo" TEXT,
    "base64Data" TEXT,
    "mimeType" TEXT,
    "tamanhoKb" INTEGER,
    "validade" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ativo',
    "versao" INTEGER NOT NULL DEFAULT 1,
    "documentoPaiId" TEXT,
    "uploadBy" TEXT,
    "confidencial" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_module_action_key" ON "Permission"("module", "action");

-- CreateIndex
CREATE UNIQUE INDEX "RolePermission_roleId_permissionId_key" ON "RolePermission"("roleId", "permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "UserRole_userId_roleId_key" ON "UserRole"("userId", "roleId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE INDEX "AuditLog_module_idx" ON "AuditLog"("module");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyConfig_cnpj_key" ON "CompanyConfig"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "Client_cnpjCpf_key" ON "Client"("cnpjCpf");

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_cnpj_key" ON "Supplier"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_cpf_key" ON "Employee"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "Proposal_number_key" ON "Proposal"("number");

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseCategory_name_key" ON "ExpenseCategory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "FiscalNfe_accessKey_key" ON "FiscalNfe"("accessKey");

-- CreateIndex
CREATE UNIQUE INDEX "FiscalSimplesDas_competence_key" ON "FiscalSimplesDas"("competence");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryCategory_name_key" ON "InventoryCategory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryItem_internalCode_key" ON "InventoryItem"("internalCode");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryItem_patrimonyNumber_key" ON "InventoryItem"("patrimonyNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Integration_slug_key" ON "Integration"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationCache_cacheKey_key" ON "IntegrationCache"("cacheKey");

-- CreateIndex
CREATE INDEX "IntegrationCache_cacheKey_idx" ON "IntegrationCache"("cacheKey");

-- CreateIndex
CREATE INDEX "IntegrationCache_expiresAt_idx" ON "IntegrationCache"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Contract_number_key" ON "Contract"("number");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_plate_key" ON "Vehicle"("plate");

-- CreateIndex
CREATE UNIQUE INDEX "ClientPortalToken_token_key" ON "ClientPortalToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Equipment_codigo_key" ON "Equipment"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "RetroJob_numero_key" ON "RetroJob"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "DedetJob_numero_key" ON "DedetJob"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "DedetProdutoCatalogo_registroAnvisa_key" ON "DedetProdutoCatalogo"("registroAnvisa");

-- CreateIndex
CREATE INDEX "Document_categoria_idx" ON "Document"("categoria");

-- CreateIndex
CREATE INDEX "Document_contratoId_idx" ON "Document"("contratoId");

-- CreateIndex
CREATE INDEX "Document_clienteId_idx" ON "Document"("clienteId");

-- CreateIndex
CREATE INDEX "Document_validade_idx" ON "Document"("validade");

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeDoc" ADD CONSTRAINT "EmployeeDoc_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProposalItem" ADD CONSTRAINT "ProposalItem_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProposalTeam" ADD CONSTRAINT "ProposalTeam_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ExpenseCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FiscalNfe" ADD CONSTRAINT "FiscalNfe_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FiscalNfse" ADD CONSTRAINT "FiscalNfse_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FiscalLaborCharge" ADD CONSTRAINT "FiscalLaborCharge_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "InventoryCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegrationLog" ADD CONSTRAINT "IntegrationLog_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "Integration"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuelLog" ADD CONSTRAINT "FuelLog_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuelLog" ADD CONSTRAINT "FuelLog_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Training" ADD CONSTRAINT "Training_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Measurement" ADD CONSTRAINT "Measurement_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeasurementItem" ADD CONSTRAINT "MeasurementItem_measurementId_fkey" FOREIGN KEY ("measurementId") REFERENCES "Measurement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryEpiDelivery" ADD CONSTRAINT "InventoryEpiDelivery_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryEpiDelivery" ADD CONSTRAINT "InventoryEpiDelivery_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mobilization" ADD CONSTRAINT "Mobilization_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mobilization" ADD CONSTRAINT "Mobilization_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServicePhoto" ADD CONSTRAINT "ServicePhoto_workDiaryId_fkey" FOREIGN KEY ("workDiaryId") REFERENCES "WorkDiary"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServicePhoto" ADD CONSTRAINT "ServicePhoto_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientPortalToken" ADD CONSTRAINT "ClientPortalToken_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentMaintenance" ADD CONSTRAINT "EquipmentMaintenance_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetroJobDespesa" ADD CONSTRAINT "RetroJobDespesa_retroJobId_fkey" FOREIGN KEY ("retroJobId") REFERENCES "RetroJob"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DedetProduto" ADD CONSTRAINT "DedetProduto_dedetJobId_fkey" FOREIGN KEY ("dedetJobId") REFERENCES "DedetJob"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
