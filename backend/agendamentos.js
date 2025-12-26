const express = require('express');
const router = express.Router();
const supabase = require('../utils/supabaseClient');

/**
 * @route POST /api/agendamentos
 * @description Cria um novo agendamento
 */
router.post('/', async (req, res) => {
  try {
    const agendamento = req.body;
    
    // Validações básicas
    if (!agendamento.cliente_nome || !agendamento.cliente_telefone) {
      return res.status(400).json({ 
        success: false, 
        error: 'Nome e telefone do cliente são obrigatórios' 
      });
    }
    
    if (!agendamento.profissional_id || !agendamento.servico_id) {
      return res.status(400).json({ 
        success: false, 
        error: 'Profissional e serviço são obrigatórios' 
      });
    }
    
    if (!agendamento.data || !agendamento.hora_inicio) {
      return res.status(400).json({ 
        success: false, 
        error: 'Data e hora são obrigatórios' 
      });
    }
    
    // Verificar disponibilidade
    const { data: disponivel, error: dispError } = await supabase
      .from('vw_disponibilidade_diaria')
      .select('disponivel')
      .eq('profissional_id', agendamento.profissional_id)
      .eq('data', agendamento.data)
      .eq('slot_inicio', agendamento.hora_inicio)
      .single();
    
    if (dispError || !disponivel?.disponivel) {
      return res.status(409).json({ 
        success: false, 
        error: 'Horário não disponível' 
      });
    }
    
    // Buscar duração do serviço para calcular hora_fim
    const { data: servico, error: servError } = await supabase
      .from('servicos')
      .select('duracao_min, valor')
      .eq('id', agendamento.servico_id)
      .single();
    
    if (servError) throw servError;
    
    // Calcular hora_fim
    const [hora, minuto] = agendamento.hora_inicio.split(':').map(Number);
    const inicioDate = new Date();
    inicioDate.setHours(hora, minuto, 0, 0);
    const fimDate = new Date(inicioDate.getTime() + servico.duracao_min * 60000);
    agendamento.hora_fim = `${fimDate.getHours().toString().padStart(2, '0')}:${fimDate.getMinutes().toString().padStart(2, '0')}`;
    
    // Definir valor cobrado
    if (!agendamento.valor_cobrado) {
      agendamento.valor_cobrado = servico.valor;
    }
    
    // Status padrão
    if (!agendamento.status) {
      agendamento.status = 'agendado';
    }
    
    // Inserir no banco
    const { data, error } = await supabase
      .from('agendamentos')
      .insert([agendamento])
      .select()
      .single();
    
    if (error) throw error;
    
    // Buscar dados completos para resposta
    const { data: completo, error: complError } = await supabase
      .from('vw_agenda_consolidada')
      .select('*')
      .eq('id', data.id)
      .single();
    
    if (complError) throw complError;
    
    res.status(201).json({
      success: true,
      message: 'Agendamento criado com sucesso',
      data: completo
    });
    
  } catch (error) {
    console.error('Erro ao criar agendamento:', error);
    
    // Tratar erro de conflito de horário (trigger)
    if (error.message.includes('Conflito de horário')) {
      return res.status(409).json({
        success: false,
        error: 'Conflito de horário. Já existe um agendamento neste período.'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Erro ao criar agendamento',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route GET /api/agendamentos
 * @description Lista agendamentos com filtros
 */
router.get('/', async (req, res) => {
  try {
    const { data_inicio, data_fim, profissional_id, status } = req.query;
    let query = supabase.from('vw_agenda_consolidada').select('*');
    
    // Aplicar filtros
    if (data_inicio) {
      query = query.gte('data', data_inicio);
    }
    
    if (data_fim) {
      query = query.lte('data', data_fim);
    }
    
    if (profissional_id) {
      query = query.eq('profissional_id', profissional_id);
    }
    
    if (status) {
      query = query.eq('status', status);
    }
    
    const { data, error } = await query
      .order('data', { ascending: false })
      .order('hora_inicio', { ascending: false });
    
    if (error) throw error;
    
    res.json({
      success: true,
      total: data?.length || 0,
      data: data || []
    });
    
  } catch (error) {
    console.error('Erro ao listar agendamentos:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro ao listar agendamentos' 
    });
  }
});

/**
 * @route PUT /api/agendamentos/:id
 * @description Atualiza um agendamento
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Não permitir atualizar ID
    delete updates.id;
    
    const { data, error } = await supabase
      .from('agendamentos')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    res.json({
      success: true,
      message: 'Agendamento atualizado com sucesso',
      data
    });
    
  } catch (error) {
    console.error('Erro ao atualizar agendamento:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro ao atualizar agendamento' 
    });
  }
});

/**
 * @route DELETE /api/agendamentos/:id
 * @description Cancela um agendamento (soft delete)
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { motivo } = req.body;
    
    const { data, error } = await supabase
      .from('agendamentos')
      .update({ 
        status: 'cancelado',
        notas: motivo ? `Cancelado: ${motivo}` : 'Agendamento cancelado'
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    res.json({
      success: true,
      message: 'Agendamento cancelado com sucesso',
      data
    });
    
  } catch (error) {
    console.error('Erro ao cancelar agendamento:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro ao cancelar agendamento' 
    });
  }
});

module.exports = router;