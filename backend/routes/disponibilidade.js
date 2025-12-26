const express = require('express');
const router = express.Router();
const supabase = require('../utils/supabaseClient');

/**
 * @route GET /api/disponibilidade/:profissional_id/:data
 * @description Obtém slots disponíveis para um profissional em uma data específica
 * @param {string} profissional_id - ID do profissional ou "all" para todos
 * @param {string} data - Data no formato YYYY-MM-DD
 */
router.get('/:profissional_id/:data', async (req, res) => {
  try {
    const { profissional_id, data } = req.params;
    
    // Validar data
    const dataObj = new Date(data);
    if (isNaN(dataObj.getTime())) {
      return res.status(400).json({ error: 'Data inválida. Use formato YYYY-MM-DD' });
    }
    
    // Configurações do sistema
    const { data: config, error: configError } = await supabase
      .from('configuracoes')
      .select('*')
      .order('id', { ascending: false })
      .limit(1)
      .single();
    
    if (configError) throw configError;
    
    let query = supabase
      .from('vw_disponibilidade_diaria')
      .select('*')
      .eq('data', data)
      .eq('disponivel', true);
    
    // Filtrar por profissional se não for "all"
    if (profissional_id !== 'all') {
      query = query.eq('profissional_id', profissional_id);
    }
    
    const { data: disponibilidade, error } = await query
      .order('profissional_nome', { ascending: true })
      .order('slot_inicio', { ascending: true });
    
    if (error) throw error;
    
    // Formatar resposta
    const response = {
      success: true,
      data: data,
      config: {
        inicio_expediente: config.inicio_expediente,
        fim_expediente: config.fim_expediente,
        intervalo_minutos: config.intervalo_slots
      },
      disponibilidade: disponibilidade || []
    };
    
    res.json(response);
    
  } catch (error) {
    console.error('Erro na disponibilidade:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro ao consultar disponibilidade',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route GET /api/disponibilidade/profissional/:id
 * @description Obtém disponibilidade completa de um profissional
 */
router.get('/profissional/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data: dataInicio = 'today', dias = 7 } = req.query;
    
    // Calcular datas
    const startDate = dataInicio === 'today' ? new Date() : new Date(dataInicio);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + parseInt(dias));
    
    // Consultar disponibilidade
    const { data: disponibilidade, error } = await supabase
      .from('vw_disponibilidade_diaria')
      .select('*')
      .eq('profissional_id', id)
      .gte('data', startDate.toISOString().split('T')[0])
      .lte('data', endDate.toISOString().split('T')[0])
      .order('data', { ascending: true })
      .order('slot_inicio', { ascending: true });
    
    if (error) throw error;
    
    // Agrupar por data
    const agrupado = {};
    disponibilidade.forEach(slot => {
      if (!agrupado[slot.data]) {
        agrupado[slot.data] = [];
      }
      agrupado[slot.data].push({
        inicio: slot.slot_inicio,
        fim: slot.slot_fim,
        disponivel: slot.disponivel
      });
    });
    
    res.json({
      success: true,
      profissional_id: id,
      periodo: {
        inicio: startDate.toISOString().split('T')[0],
        fim: endDate.toISOString().split('T')[0],
        dias: parseInt(dias)
      },
      disponibilidade: agrupado
    });
    
  } catch (error) {
    console.error('Erro na disponibilidade do profissional:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro ao consultar disponibilidade' 
    });
  }
});

/**
 * @route GET /api/disponibilidade/hoje
 * @description Obtém disponibilidade do dia atual
 */
router.get('/hoje/:profissional_id?', async (req, res) => {
  try {
    const { profissional_id } = req.params;
    const hoje = new Date().toISOString().split('T')[0];
    
    let query = supabase
      .from('vw_disponibilidade_diaria')
      .select('*')
      .eq('data', hoje)
      .eq('disponivel', true);
    
    if (profissional_id) {
      query = query.eq('profissional_id', profissional_id);
    }
    
    const { data: disponibilidade, error } = await query
      .order('profissional_nome')
      .order('slot_inicio');
    
    if (error) throw error;
    
    res.json({
      success: true,
      data: hoje,
      total_slots: disponibilidade?.length || 0,
      disponibilidade: disponibilidade || []
    });
    
  } catch (error) {
    console.error('Erro na disponibilidade de hoje:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro ao consultar disponibilidade de hoje' 
    });
  }
});

module.exports = router;