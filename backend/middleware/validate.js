// backend/middleware/validate.js
/**
 * Middleware de validação para a API
 */

/**
 * Valida dados de agendamento
 */
const validateAgendamento = (req, res, next) => {
  const errors = [];
  const agendamento = req.body;

  // Nome do cliente
  if (!agendamento.cliente_nome || agendamento.cliente_nome.trim().length < 3) {
    errors.push('Nome do cliente deve ter pelo menos 3 caracteres');
  }

  // Telefone
  if (!agendamento.cliente_telefone) {
    errors.push('Telefone é obrigatório');
  } else if (!/^[\d\s()+-]{10,20}$/.test(agendamento.cliente_telefone.replace(/\D/g, ''))) {
    errors.push('Telefone inválido');
  }

  // Email (opcional, mas se fornecido, validar)
  if (agendamento.cliente_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(agendamento.cliente_email)) {
    errors.push('Email inválido');
  }

  // Profissional
  if (!agendamento.profissional_id) {
    errors.push('Profissional é obrigatório');
  } else if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(agendamento.profissional_id)) {
    errors.push('ID do profissional inválido');
  }

  // Serviço
  if (!agendamento.servico_id) {
    errors.push('Serviço é obrigatório');
  } else if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(agendamento.servico_id)) {
    errors.push('ID do serviço inválido');
  }

  // Data
  if (!agendamento.data) {
    errors.push('Data é obrigatória');
  } else {
    const dataObj = new Date(agendamento.data);
    if (isNaN(dataObj.getTime())) {
      errors.push('Data inválida. Use formato YYYY-MM-DD');
    } else if (dataObj < new Date().setHours(0, 0, 0, 0)) {
      errors.push('Não é possível agendar para datas passadas');
    }
  }

  // Hora início
  if (!agendamento.hora_inicio) {
    errors.push('Hora de início é obrigatória');
  } else if (!/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(agendamento.hora_inicio)) {
    errors.push('Hora inválida. Use formato HH:MM (24h)');
  } else {
    const [hora, minuto] = agendamento.hora_inicio.split(':').map(Number);
    if (hora < 8 || hora > 20 || (hora === 20 && minuto > 30)) {
      errors.push('Horário fora do expediente (08:00 - 20:30)');
    }
    if (minuto % 30 !== 0) {
      errors.push('Horários devem ser em intervalos de 30 minutos');
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      errors: errors
    });
  }

  next();
};

/**
 * Valida dados de profissional
 */
const validateProfissional = (req, res, next) => {
  const errors = [];
  const profissional = req.body;

  if (!profissional.nome || profissional.nome.trim().length < 3) {
    errors.push('Nome do profissional deve ter pelo menos 3 caracteres');
  }

  if (profissional.especialidades && !Array.isArray(profissional.especialidades)) {
    errors.push('Especialidades devem ser um array');
  }

  if (profissional.cor_agenda && !/^#[0-9A-F]{6}$/i.test(profissional.cor_agenda)) {
    errors.push('Cor da agenda deve ser em formato hexadecimal (#RRGGBB)');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      errors: errors
    });
  }

  next();
};

/**
 * Valida dados de serviço
 */
const validateServico = (req, res, next) => {
  const errors = [];
  const servico = req.body;

  if (!servico.nome || servico.nome.trim().length < 3) {
    errors.push('Nome do serviço deve ter pelo menos 3 caracteres');
  }

  if (!servico.duracao_min || servico.duracao_min < 15 || servico.duracao_min > 240) {
    errors.push('Duração deve ser entre 15 e 240 minutos');
  }

  if (servico.valor && (servico.valor < 0 || servico.valor > 10000)) {
    errors.push('Valor inválido');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      errors: errors
    });
  }

  next();
};

/**
 * Valida parâmetros de consulta
 */
const validateQueryParams = (req, res, next) => {
  const errors = [];
  const { data_inicio, data_fim, status, limit, offset } = req.query;

  if (data_inicio) {
    const data = new Date(data_inicio);
    if (isNaN(data.getTime())) {
      errors.push('data_inicio inválida. Use YYYY-MM-DD');
    }
  }

  if (data_fim) {
    const data = new Date(data_fim);
    if (isNaN(data.getTime())) {
      errors.push('data_fim inválida. Use YYYY-MM-DD');
    }
  }

  if (data_inicio && data_fim) {
    const inicio = new Date(data_inicio);
    const fim = new Date(data_fim);
    if (inicio > fim) {
      errors.push('data_inicio não pode ser depois de data_fim');
    }
  }

  if (status) {
    const statusValidos = ['agendado', 'confirmado', 'realizado', 'cancelado', 'ausente'];
    if (!statusValidos.includes(status)) {
      errors.push(`Status inválido. Use: ${statusValidos.join(', ')}`);
    }
  }

  if (limit && (isNaN(limit) || limit < 1 || limit > 100)) {
    errors.push('Limit deve ser entre 1 e 100');
  }

  if (offset && (isNaN(offset) || offset < 0)) {
    errors.push('Offset deve ser um número positivo');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      errors: errors
    });
  }

  next();
};

/**
 * Valida UUID
 */
const validateUUID = (paramName) => {
  return (req, res, next) => {
    const uuid = req.params[paramName];
    
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid)) {
      return res.status(400).json({
        success: false,
        error: `UUID inválido no parâmetro ${paramName}`
      });
    }
    
    next();
  };
};

/**
 * Valida data no formato YYYY-MM-DD
 */
const validateDateParam = (paramName) => {
  return (req, res, next) => {
    const dateStr = req.params[paramName];
    
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return res.status(400).json({
        success: false,
        error: `Data inválida no parâmetro ${paramName}. Use formato YYYY-MM-DD`
      });
    }
    
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return res.status(400).json({
        success: false,
        error: `Data inválida no parâmetro ${paramName}`
      });
    }
    
    next();
  };
};

/**
 * Middleware para log de requisições
 */
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${new Date().toISOString()} ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
  });
  
  next();
};

/**
 * Middleware para erros de validação do Joi (opcional)
 */
const validateJoi = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false });
    
    if (error) {
      return res.status(400).json({
        success: false,
        errors: error.details.map(detail => detail.message)
      });
    }
    
    next();
  };
};

module.exports = {
  validateAgendamento,
  validateProfissional,
  validateServico,
  validateQueryParams,
  validateUUID,
  validateDateParam,
  requestLogger,
  validateJoi
};