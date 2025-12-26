const express = require('express');
const router = express.Router();
const supabase = require('../utils/supabaseClient');

/**
 * @route GET /api/config
 * @description Obtém configurações do sistema
 */
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('configuracoes')
      .select('*')
      .order('id', { ascending: false })
      .limit(1)
      .single();
    
    if (error) {
      // Se não existir configuração, retorna padrão
      return res.json({
        success: true,
        config: {
          inicio_expediente: '08:00',
          fim_expediente: '21:00',
          intervalo_slots: 30,
          dias_antecedencia: 30
        },
        message: 'Usando configurações padrão'
      });
    }
    
    res.json({
      success: true,
      config: data
    });
    
  } catch (error) {
    console.error('Erro ao buscar configurações:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro ao buscar configurações' 
    });
  }
});

/**
 * @route PUT /api/config
 * @description Atualiza configurações do sistema
 */
router.put('/', async (req, res) => {
  try {
    const config = req.body;
    
    // Buscar configuração atual
    const { data: existing, error: fetchError } = await supabase
      .from('configuracoes')
      .select('id')
      .order('id', { ascending: false })
      .limit(1)
      .single();
    
    let result;
    
    if (fetchError || !existing) {
      // Criar primeira configuração
      const { data, error } = await supabase
        .from('configuracoes')
        .insert([config])
        .select()
        .single();
      
      if (error) throw error;
      result = data;
      
    } else {
      // Atualizar configuração existente
      const { data, error } = await supabase
        .from('configuracoes')
        .update(config)
        .eq('id', existing.id)
        .select()
        .single();
      
      if (error) throw error;
      result = data;
    }
    
    res.json({
      success: true,
      message: 'Configurações atualizadas com sucesso',
      config: result
    });
    
  } catch (error) {
    console.error('Erro ao atualizar configurações:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro ao atualizar configurações' 
    });
  }
});

module.exports = router;
