// Lista de cidades brasileiras para autocomplete
export interface City {
  name: string;
  state: string;
  region: string;
}

export const brazilianCities: City[] = [
  // São Paulo
  { name: 'São Paulo', state: 'SP', region: 'Sudeste' },
  { name: 'Guarulhos', state: 'SP', region: 'Sudeste' },
  { name: 'Campinas', state: 'SP', region: 'Sudeste' },
  { name: 'São Bernardo do Campo', state: 'SP', region: 'Sudeste' },
  { name: 'Santo André', state: 'SP', region: 'Sudeste' },
  { name: 'Osasco', state: 'SP', region: 'Sudeste' },
  { name: 'Ribeirão Preto', state: 'SP', region: 'Sudeste' },
  { name: 'Sorocaba', state: 'SP', region: 'Sudeste' },
  { name: 'Santos', state: 'SP', region: 'Sudeste' },
  { name: 'Praia Grande', state: 'SP', region: 'Sudeste' },
  { name: 'São José dos Campos', state: 'SP', region: 'Sudeste' },
  { name: 'Piracicaba', state: 'SP', region: 'Sudeste' },
  { name: 'Bauru', state: 'SP', region: 'Sudeste' },
  { name: 'Jundiaí', state: 'SP', region: 'Sudeste' },
  { name: 'São Vicente', state: 'SP', region: 'Sudeste' },

  // Rio de Janeiro
  { name: 'Rio de Janeiro', state: 'RJ', region: 'Sudeste' },
  { name: 'São Gonçalo', state: 'RJ', region: 'Sudeste' },
  { name: 'Duque de Caxias', state: 'RJ', region: 'Sudeste' },
  { name: 'Nova Iguaçu', state: 'RJ', region: 'Sudeste' },
  { name: 'Niterói', state: 'RJ', region: 'Sudeste' },
  { name: 'Campos dos Goytacazes', state: 'RJ', region: 'Sudeste' },
  { name: 'Belford Roxo', state: 'RJ', region: 'Sudeste' },
  { name: 'São João de Meriti', state: 'RJ', region: 'Sudeste' },
  { name: 'Petrópolis', state: 'RJ', region: 'Sudeste' },
  { name: 'Volta Redonda', state: 'RJ', region: 'Sudeste' },

  // Minas Gerais
  { name: 'Belo Horizonte', state: 'MG', region: 'Sudeste' },
  { name: 'Uberlândia', state: 'MG', region: 'Sudeste' },
  { name: 'Contagem', state: 'MG', region: 'Sudeste' },
  { name: 'Juiz de Fora', state: 'MG', region: 'Sudeste' },
  { name: 'Betim', state: 'MG', region: 'Sudeste' },
  { name: 'Montes Claros', state: 'MG', region: 'Sudeste' },
  { name: 'Ribeirão das Neves', state: 'MG', region: 'Sudeste' },
  { name: 'Uberaba', state: 'MG', region: 'Sudeste' },
  { name: 'Governador Valadares', state: 'MG', region: 'Sudeste' },
  { name: 'Ipatinga', state: 'MG', region: 'Sudeste' },

  // Bahia
  { name: 'Salvador', state: 'BA', region: 'Nordeste' },
  { name: 'Feira de Santana', state: 'BA', region: 'Nordeste' },
  { name: 'Vitória da Conquista', state: 'BA', region: 'Nordeste' },
  { name: 'Camaçari', state: 'BA', region: 'Nordeste' },
  { name: 'Juazeiro', state: 'BA', region: 'Nordeste' },
  { name: 'Lauro de Freitas', state: 'BA', region: 'Nordeste' },
  { name: 'Ilhéus', state: 'BA', region: 'Nordeste' },
  { name: 'Jequié', state: 'BA', region: 'Nordeste' },
  { name: 'Teixeira de Freitas', state: 'BA', region: 'Nordeste' },
  { name: 'Alagoinhas', state: 'BA', region: 'Nordeste' },

  // Paraná
  { name: 'Curitiba', state: 'PR', region: 'Sul' },
  { name: 'Londrina', state: 'PR', region: 'Sul' },
  { name: 'Maringá', state: 'PR', region: 'Sul' },
  { name: 'Ponta Grossa', state: 'PR', region: 'Sul' },
  { name: 'Cascavel', state: 'PR', region: 'Sul' },
  { name: 'São José dos Pinhais', state: 'PR', region: 'Sul' },
  { name: 'Foz do Iguaçu', state: 'PR', region: 'Sul' },
  { name: 'Colombo', state: 'PR', region: 'Sul' },
  { name: 'Guarapuava', state: 'PR', region: 'Sul' },
  { name: 'Paranaguá', state: 'PR', region: 'Sul' },

  // Rio Grande do Sul
  { name: 'Porto Alegre', state: 'RS', region: 'Sul' },
  { name: 'Caxias do Sul', state: 'RS', region: 'Sul' },
  { name: 'Pelotas', state: 'RS', region: 'Sul' },
  { name: 'Canoas', state: 'RS', region: 'Sul' },
  { name: 'Santa Maria', state: 'RS', region: 'Sul' },
  { name: 'Gravataí', state: 'RS', region: 'Sul' },
  { name: 'Viamão', state: 'RS', region: 'Sul' },
  { name: 'Novo Hamburgo', state: 'RS', region: 'Sul' },
  { name: 'São Leopoldo', state: 'RS', region: 'Sul' },
  { name: 'Rio Grande', state: 'RS', region: 'Sul' },

  // Santa Catarina
  { name: 'Joinville', state: 'SC', region: 'Sul' },
  { name: 'Florianópolis', state: 'SC', region: 'Sul' },
  { name: 'Blumenau', state: 'SC', region: 'Sul' },
  { name: 'São José', state: 'SC', region: 'Sul' },
  { name: 'Criciúma', state: 'SC', region: 'Sul' },
  { name: 'Chapecó', state: 'SC', region: 'Sul' },
  { name: 'Itajaí', state: 'SC', region: 'Sul' },
  { name: 'Jaraguá do Sul', state: 'SC', region: 'Sul' },
  { name: 'Lages', state: 'SC', region: 'Sul' },
  { name: 'Palhoça', state: 'SC', region: 'Sul' },

  // Espírito Santo
  { name: 'Vitória', state: 'ES', region: 'Sudeste' },
  { name: 'Vila Velha', state: 'ES', region: 'Sudeste' },
  { name: 'Serra', state: 'ES', region: 'Sudeste' },
  { name: 'Cariacica', state: 'ES', region: 'Sudeste' },
  { name: 'Cachoeiro de Itapemirim', state: 'ES', region: 'Sudeste' },
  { name: 'Linhares', state: 'ES', region: 'Sudeste' },
  { name: 'São Mateus', state: 'ES', region: 'Sudeste' },
  { name: 'Colatina', state: 'ES', region: 'Sudeste' },
  { name: 'Guarapari', state: 'ES', region: 'Sudeste' },
  { name: 'Aracruz', state: 'ES', region: 'Sudeste' },

  // Pernambuco
  { name: 'Recife', state: 'PE', region: 'Nordeste' },
  { name: 'Jaboatão dos Guararapes', state: 'PE', region: 'Nordeste' },
  { name: 'Olinda', state: 'PE', region: 'Nordeste' },
  { name: 'Paulista', state: 'PE', region: 'Nordeste' },
  { name: 'Petrolina', state: 'PE', region: 'Nordeste' },
  { name: 'Caruaru', state: 'PE', region: 'Nordeste' },
  { name: 'Cabo de Santo Agostinho', state: 'PE', region: 'Nordeste' },
  { name: 'Camaragibe', state: 'PE', region: 'Nordeste' },
  { name: 'Garanhuns', state: 'PE', region: 'Nordeste' },
  { name: 'Vitória de Santo Antão', state: 'PE', region: 'Nordeste' },

  // Mais estados importantes...
  { name: 'Brasília', state: 'DF', region: 'Centro-Oeste' },
  { name: 'Goiânia', state: 'GO', region: 'Centro-Oeste' },
  { name: 'Aparecida de Goiânia', state: 'GO', region: 'Centro-Oeste' },
  { name: 'Campo Grande', state: 'MS', region: 'Centro-Oeste' },
  { name: 'Cuiabá', state: 'MT', region: 'Centro-Oeste' },
  { name: 'Várzea Grande', state: 'MT', region: 'Centro-Oeste' },
  { name: 'Fortaleza', state: 'CE', region: 'Nordeste' },
  { name: 'Caucaia', state: 'CE', region: 'Nordeste' },
  { name: 'Juazeiro do Norte', state: 'CE', region: 'Nordeste' },
  { name: 'Maracanaú', state: 'CE', region: 'Nordeste' },
  { name: 'Natal', state: 'RN', region: 'Nordeste' },
  { name: 'Mossoró', state: 'RN', region: 'Nordeste' },
  { name: 'João Pessoa', state: 'PB', region: 'Nordeste' },
  { name: 'Campina Grande', state: 'PB', region: 'Nordeste' },
  { name: 'Teresina', state: 'PI', region: 'Nordeste' },
  { name: 'Parnaíba', state: 'PI', region: 'Nordeste' },
  { name: 'São Luís', state: 'MA', region: 'Nordeste' },
  { name: 'Imperatriz', state: 'MA', region: 'Nordeste' },
  { name: 'Belém', state: 'PA', region: 'Norte' },
  { name: 'Ananindeua', state: 'PA', region: 'Norte' },
  { name: 'Santarém', state: 'PA', region: 'Norte' },
  { name: 'Manaus', state: 'AM', region: 'Norte' },
  { name: 'Parintins', state: 'AM', region: 'Norte' },
  { name: 'Porto Velho', state: 'RO', region: 'Norte' },
  { name: 'Rio Branco', state: 'AC', region: 'Norte' },
  { name: 'Macapá', state: 'AP', region: 'Norte' },
  { name: 'Boa Vista', state: 'RR', region: 'Norte' },
  { name: 'Palmas', state: 'TO', region: 'Norte' },
  { name: 'Araguaína', state: 'TO', region: 'Norte' },
  { name: 'Aracaju', state: 'SE', region: 'Nordeste' },
  { name: 'Nossa Senhora do Socorro', state: 'SE', region: 'Nordeste' },
  { name: 'Maceió', state: 'AL', region: 'Nordeste' },
  { name: 'Arapiraca', state: 'AL', region: 'Nordeste' }
];

// Função para buscar cidades por termo
export const searchCities = (searchTerm: string): City[] => {
  if (!searchTerm || searchTerm.length < 2) return [];
  
  const term = searchTerm.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  return brazilianCities
    .filter(city => {
      const cityName = city.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const stateName = city.state.toLowerCase();
      
      return cityName.includes(term) || stateName.includes(term);
    })
    .slice(0, 10); // Limitar a 10 resultados
};

// Função para formatar cidade + estado
export const formatCityState = (city: City): string => {
  return `${city.name}/${city.state}`;
};

// Estados brasileiros para select
export const brazilianStates = [
  { code: 'AC', name: 'Acre' },
  { code: 'AL', name: 'Alagoas' },
  { code: 'AP', name: 'Amapá' },
  { code: 'AM', name: 'Amazonas' },
  { code: 'BA', name: 'Bahia' },
  { code: 'CE', name: 'Ceará' },
  { code: 'DF', name: 'Distrito Federal' },
  { code: 'ES', name: 'Espírito Santo' },
  { code: 'GO', name: 'Goiás' },
  { code: 'MA', name: 'Maranhão' },
  { code: 'MT', name: 'Mato Grosso' },
  { code: 'MS', name: 'Mato Grosso do Sul' },
  { code: 'MG', name: 'Minas Gerais' },
  { code: 'PA', name: 'Pará' },
  { code: 'PB', name: 'Paraíba' },
  { code: 'PR', name: 'Paraná' },
  { code: 'PE', name: 'Pernambuco' },
  { code: 'PI', name: 'Piauí' },
  { code: 'RJ', name: 'Rio de Janeiro' },
  { code: 'RN', name: 'Rio Grande do Norte' },
  { code: 'RS', name: 'Rio Grande do Sul' },
  { code: 'RO', name: 'Rondônia' },
  { code: 'RR', name: 'Roraima' },
  { code: 'SC', name: 'Santa Catarina' },
  { code: 'SP', name: 'São Paulo' },
  { code: 'SE', name: 'Sergipe' },
  { code: 'TO', name: 'Tocantins' }
]; 