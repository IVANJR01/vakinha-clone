// Vakinha Clone Application Logic
document.addEventListener('DOMContentLoaded', () => {
  // App State
  let campaigns = [...VAKINHA_CAMPAIGNS];
  let filteredCampaigns = [...campaigns];
  let currentPage = 1;
  const itemsPerPage = 9;
  let activeCategory = 'all';
  let searchQuery = '';
  let activeSort = 'spotlight';
  let activeState = 'all';
  const likedCampaigns = new Set();
  let currentDonationCampaign = null;
  let selectedDonationAmount = 50;

  // DOM Elements
  const grid = document.getElementById('campaignsGrid');
  const countBadge = document.getElementById('campaignsCountBadge');
  const loadMoreBtn = document.getElementById('loadMoreBtn');
  const searchInput = document.getElementById('searchInput');
  const clearSearchBtn = document.getElementById('clearSearchBtn');
  const sortSelect = document.getElementById('sortSelect');
  const chipsContainer = document.getElementById('categoryChips');
  const toastContainer = document.getElementById('toastContainer');

  // Modals
  const donationModal = document.getElementById('donationModal');
  const detailModal = document.getElementById('detailModal');
  const createModal = document.getElementById('createModal');
  const filterModal = document.getElementById('filterModal');
  const mobileDrawer = document.getElementById('mobileDrawer');
  const mobileOverlay = document.getElementById('mobileDrawerOverlay');

  // Formatting utilities
  const formatCurrency = (val) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(val);
  };

  const formatShortValue = (val) => {
    if (val >= 1000000) {
      const millions = (val / 1000000).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
      return `${millions} mi`;
    }
    return formatCurrency(val);
  };

  const showToast = (message, type = 'info') => {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <span>${type === 'success' ? '✓' : 'ℹ'}</span>
      <span>${message}</span>
    `;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(20px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  };

  // Filter & Sort Logic
  const applyFilters = () => {
    filteredCampaigns = campaigns.filter(c => {
      // Category filter
      if (activeCategory !== 'all' && c.categoryName !== activeCategory) {
        return false;
      }
      // State filter
      if (activeState !== 'all' && c.state !== activeState) {
        return false;
      }
      // Search query
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const matchesTitle = c.title.toLowerCase().includes(q);
        const matchesDesc = c.description.toLowerCase().includes(q);
        const matchesCreator = c.creator.toLowerCase().includes(q);
        const matchesId = c.id.toString().includes(q);
        if (!matchesTitle && !matchesDesc && !matchesCreator && !matchesId) {
          return false;
        }
      }
      return true;
    });

    // Sorting
    filteredCampaigns.sort((a, b) => {
      switch (activeSort) {
        case 'most_backed':
          return (b.donorsCount || 0) - (a.donorsCount || 0);
        case 'highest_collected':
          return b.collectedValue - a.collectedValue;
        case 'lowest_collected':
          return a.collectedValue - b.collectedValue;
        case 'highest_percent':
          return (b.collectedPercentValue || 0) - (a.collectedPercentValue || 0);
        case 'recent':
          return b.id - a.id;
        default: // spotlight
          return 0; // keeps initial spotlight curated order
      }
    });

    currentPage = 1;
    renderGrid();
  };

  // Render Campaign Cards
  const renderGrid = () => {
    const visibleCount = currentPage * itemsPerPage;
    const itemsToDisplay = filteredCampaigns.slice(0, visibleCount);

    countBadge.textContent = `${filteredCampaigns.length} vaquinhas encontradas`;

    if (itemsToDisplay.length === 0) {
      grid.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🔍</div>
          <h3>Nenhuma vaquinha encontrada</h3>
          <p>Tente ajustar a sua busca ou remover alguns filtros para encontrar mais causas.</p>
          <button class="btn-create-campaign" onclick="resetFilters()">Limpar filtros</button>
        </div>
      `;
      loadMoreBtn.style.display = 'none';
      return;
    }

    grid.innerHTML = itemsToDisplay.map(c => {
      const isLiked = likedCampaigns.has(c.id);
      const percent = Math.min(100, Math.max(0, c.collectedPercentValue || 0)).toFixed(1);
      const formattedCollected = formatCurrency(c.collectedValue);
      const formattedGoal = formatShortValue(c.goal);

      return `
        <article class="campaign-card" data-id="${c.id}">
          <div class="card-image-wrap">
            <span class="card-category-tag">${c.categoryName}</span>
            <img 
              src="${c.image}" 
              alt="${c.title}" 
              loading="lazy" 
              onerror="this.onerror=null; this.src='https://static.vakinha.com.br/static/v4/vaquinha_default.png?ims=700x410';"
            />
            <button 
              type="button" 
              class="card-heart-btn ${isLiked ? 'liked' : ''}" 
              title="Apoiar com coração" 
              onclick="window.toggleLike(event, ${c.id})"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="${isLiked ? '#ff385c' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
              </svg>
            </button>
          </div>

          <div class="card-body">
            <div class="card-id-row">
              <span class="card-id-badge">ID: ${c.id}</span>
              <span>${c.city ? `${c.city}${c.state ? ' / ' + c.state : ''}` : ''}</span>
            </div>

            <h2 class="card-title" onclick="window.openDetailModal(${c.id})" title="${c.title}">
              ${c.title}
            </h2>

            <div class="card-creator-row">
              <img class="card-creator-avatar" src="${c.creatorAvatar}" alt="${c.creator}" onerror="this.src='https://ui-avatars.com/api/?background=009D4E&color=fff&name=V';" />
              <span class="card-creator-info">Por <strong>${c.creator}</strong></span>
            </div>

            <div class="card-progress-section">
              <div class="card-values-row">
                <span class="collected-value">${formattedCollected}</span>
                <span class="goal-value">de ${formattedGoal}</span>
              </div>
              <div class="progress-track" title="${percent}% da meta alcançada">
                <div class="progress-fill" style="width: ${percent}%;"></div>
              </div>
            </div>

            <div class="card-stats-footer">
              <div class="donor-avatars-group" title="${c.donorsCount} pessoas já ajudaram">
                ${c.donorAvatars.slice(0, 3).map(avatar => `
                  <img src="${avatar}" alt="Doador" onerror="this.src='https://ui-avatars.com/api/?background=009D4E&color=fff&name=D';" />
                `).join('')}
                <span class="donors-count-text">${c.donorsCount.toLocaleString('pt-BR')} doações</span>
              </div>
              <button type="button" class="card-action-btn" onclick="window.openDonationModal(${c.id})">
                Ajudar
              </button>
            </div>
          </div>
        </article>
      `;
    }).join('');

    // Toggle Load More button
    if (visibleCount >= filteredCampaigns.length) {
      loadMoreBtn.style.display = 'none';
    } else {
      loadMoreBtn.style.display = 'inline-flex';
      loadMoreBtn.textContent = `Carregar mais vaquinhas (${filteredCampaigns.length - visibleCount} restantes)`;
    }
  };

  // Interactive Hearts / Likes
  window.toggleLike = (event, id) => {
    event.stopPropagation();
    const c = campaigns.find(item => item.id === id);
    if (!c) return;

    if (likedCampaigns.has(id)) {
      likedCampaigns.delete(id);
      c.stickersCount = Math.max(0, (c.stickersCount || 1) - 1);
      showToast('Coração removido da vaquinha.');
    } else {
      likedCampaigns.add(id);
      c.stickersCount = (c.stickersCount || 0) + 1;
      showToast(`Você enviou um coração para "${c.title}"! ❤️`, 'success');
    }
    renderGrid();
  };

  // Reset Filters
  window.resetFilters = () => {
    activeCategory = 'all';
    searchQuery = '';
    activeSort = 'spotlight';
    activeState = 'all';
    searchInput.value = '';
    clearSearchBtn.style.display = 'none';
    sortSelect.value = 'spotlight';
    
    document.querySelectorAll('.category-chip').forEach(chip => {
      chip.classList.toggle('active', chip.dataset.cat === 'all');
    });

    applyFilters();
  };

  // Event Listeners for Search
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    clearSearchBtn.style.display = searchQuery ? 'block' : 'none';
    applyFilters();
  });

  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    searchQuery = '';
    clearSearchBtn.style.display = 'none';
    applyFilters();
  });

  // Category Chips
  chipsContainer.addEventListener('click', (e) => {
    const chip = e.target.closest('.category-chip');
    if (!chip) return;
    
    document.querySelectorAll('.category-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    activeCategory = chip.dataset.cat;
    applyFilters();
  });

  // Sort Select
  sortSelect.addEventListener('change', (e) => {
    activeSort = e.target.value;
    applyFilters();
  });

  // Load More Button
  loadMoreBtn.addEventListener('click', () => {
    loadMoreBtn.classList.add('loading');
    loadMoreBtn.textContent = 'Carregando vaquinhas...';
    setTimeout(() => {
      currentPage++;
      renderGrid();
      loadMoreBtn.classList.remove('loading');
    }, 350);
  });

  // Detail Modal
  window.openDetailModal = (id) => {
    const c = campaigns.find(item => item.id === id);
    if (!c) return;

    const percent = Math.min(100, Math.max(0, c.collectedPercentValue || 0)).toFixed(1);

    document.getElementById('detailModalImage').src = c.image;
    document.getElementById('detailModalTag').textContent = c.categoryName;
    document.getElementById('detailModalTitle').textContent = c.title;
    document.getElementById('detailModalId').textContent = `ID: ${c.id}`;
    document.getElementById('detailModalLocation').textContent = `${c.city || ''} ${c.state ? '- ' + c.state : ''}`;
    document.getElementById('detailModalCreator').textContent = c.creator;
    document.getElementById('detailModalCreatorAvatar').src = c.creatorAvatar;
    document.getElementById('detailModalCollected').textContent = formatCurrency(c.collectedValue);
    document.getElementById('detailModalGoal').textContent = `Meta: ${formatCurrency(c.goal)}`;
    document.getElementById('detailModalProgress').style.width = `${percent}%`;
    document.getElementById('detailModalPercent').textContent = `${percent}%`;
    document.getElementById('detailModalDonors').textContent = `${c.donorsCount.toLocaleString('pt-BR')} apoiadores`;
    document.getElementById('detailModalDescription').innerHTML = c.fullDescription || `<p>${c.description}</p>`;

    document.getElementById('detailModalDonateBtn').onclick = () => {
      closeAllModals();
      window.openDonationModal(c.id);
    };

    document.getElementById('detailModalShareBtn').onclick = () => {
      const shareUrl = `${window.location.origin}${window.location.pathname}?v=${c.id}`;
      if (navigator.share) {
        navigator.share({
          title: c.title,
          text: `Ajude nesta causa: ${c.title}`,
          url: shareUrl
        }).catch(() => {
          navigator.clipboard.writeText(shareUrl);
          showToast('Link da vaquinha copiado com sucesso! 📋', 'success');
        });
      } else {
        navigator.clipboard.writeText(shareUrl);
        showToast('Link da vaquinha copiado com sucesso! 📋', 'success');
      }
    };

    detailModal.classList.add('active');
  };

  // Estado da transação VizionPay
  let activeVizionpayTxId = null;
  let vizionpayPollTimer = null;
  let vizionpayCountdownTimer = null;
  let vizionpayCountdownSeconds = 900; // 15 minutos
  let selectedMethod = 'pix';

  // Alternância de Método de Pagamento
  document.querySelectorAll('.payment-method-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.payment-method-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      const radio = card.querySelector('input[type="radio"]');
      if (radio) radio.checked = true;
      selectedMethod = card.dataset.method || 'pix';
    });
  });

  // Atualizar preview do valor no botão
  const updateAmountDisplays = (val) => {
    const preview = document.getElementById('btnAmountPreview');
    if (preview) {
      preview.textContent = `Total: ${formatCurrency(val)}`;
    }
  };

  // Abrir Checkout VizionPay
  window.openDonationModal = (id) => {
    const c = campaigns.find(item => item.id === id);
    if (!c) return;
    currentDonationCampaign = c;
    selectedDonationAmount = 50;
    selectedMethod = 'pix';

    // Reseta etapas
    document.getElementById('vizionpayStep1').style.display = 'block';
    document.getElementById('vizionpayStepPix').style.display = 'none';
    document.getElementById('vizionpayStepSuccess').style.display = 'none';

    // Limpa timers anteriores
    clearInterval(vizionpayPollTimer);
    clearInterval(vizionpayCountdownTimer);

    // Preenche dados da campanha no modal
    document.getElementById('donationModalTitle').textContent = c.title;
    const thumb = document.getElementById('donationCampaignThumb');
    if (thumb) thumb.src = c.image;

    // Reset valor
    document.getElementById('customAmountInput').value = '50';
    updateAmountDisplays(50);

    // Reset presets
    document.querySelectorAll('.donation-preset-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.val === '50');
    });

    // Reset método para Pix
    document.querySelectorAll('.payment-method-card').forEach(card => {
      const isPix = card.dataset.method === 'pix';
      card.classList.toggle('active', isPix);
      const radio = card.querySelector('input[type="radio"]');
      if (radio) radio.checked = isPix;
    });

    donationModal.classList.add('active');
  };

  // Presets de Doação
  document.querySelectorAll('.donation-preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.donation-preset-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const val = parseFloat(btn.dataset.val);
      selectedDonationAmount = val;
      document.getElementById('customAmountInput').value = val;
      updateAmountDisplays(val);
    });
  });

  const customAmountInput = document.getElementById('customAmountInput');
  if (customAmountInput) {
    customAmountInput.addEventListener('input', (e) => {
      document.querySelectorAll('.donation-preset-btn').forEach(b => b.classList.remove('active'));
      const val = parseFloat(e.target.value) || 0;
      selectedDonationAmount = val;
      updateAmountDisplays(val);
    });
  }

  // Timer Regressivo do Pix VizionPay (15 minutos)
  const startVizionpayCountdown = () => {
    clearInterval(vizionpayCountdownTimer);
    vizionpayCountdownSeconds = 15 * 60;
    const countdownEl = document.getElementById('vizionpayCountdown');

    const updateTimer = () => {
      const minutes = Math.floor(vizionpayCountdownSeconds / 60);
      const seconds = vizionpayCountdownSeconds % 60;
      if (countdownEl) {
        countdownEl.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
      }
      if (vizionpayCountdownSeconds <= 0) {
        clearInterval(vizionpayCountdownTimer);
        clearInterval(vizionpayPollTimer);
        const statusText = document.getElementById('vizionpayStatusText');
        if (statusText) statusText.textContent = 'Tempo expirado. Gere uma nova doação.';
      } else {
        vizionpayCountdownSeconds--;
      }
    };

    updateTimer();
    vizionpayCountdownTimer = setInterval(updateTimer, 1000);
  };

  // Polling de Status da VizionPay
  const startStatusPolling = (txId) => {
    clearInterval(vizionpayPollTimer);
    vizionpayPollTimer = setInterval(async () => {
      try {
        const res = await fetch(`/api/vizionpay/status/${txId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.status === 'paid') {
          clearInterval(vizionpayPollTimer);
          clearInterval(vizionpayCountdownTimer);
          handleVizionpayPaymentSuccess(data);
        }
      } catch (err) {
        console.warn('Erro ao consultar status VizionPay:', err);
      }
    }, 2500);
  };

  // Sucesso na Confirmação
  const handleVizionpayPaymentSuccess = (txData) => {
    const amount = txData.amount || selectedDonationAmount || 50;

    // Atualiza estado da campanha localmente se não veio pelo server
    if (currentDonationCampaign) {
      currentDonationCampaign.collectedValue += amount;
      currentDonationCampaign.donorsCount += 1;
      currentDonationCampaign.collectedPercentValue = Math.min(
        100,
        (currentDonationCampaign.collectedValue / currentDonationCampaign.goal) * 100
      );
    }

    // Atualiza recibo
    const receiptAmountEl = document.getElementById('receiptAmount');
    if (receiptAmountEl) receiptAmountEl.textContent = formatCurrency(amount);

    const receiptTxEl = document.getElementById('receiptTxId');
    if (receiptTxEl) {
      const rawId = txData.transactionId || activeVizionpayTxId || '000000';
      receiptTxEl.textContent = `VK-${rawId.replace(/^VP-/, '')}`;
    }

    // Transição de tela
    document.getElementById('vizionpayStep1').style.display = 'none';
    document.getElementById('vizionpayStepPix').style.display = 'none';
    document.getElementById('vizionpayStepSuccess').style.display = 'block';

    showToast(`Doação de ${formatCurrency(amount)} confirmada com sucesso! 🎉`, 'success');
    renderGrid();
  };

  // Botão: Continuar para Doação (Etapa 1 -> Etapa 2)
  const btnProceedVizionpay = document.getElementById('btnProceedVizionpay');
  if (btnProceedVizionpay) {
    btnProceedVizionpay.addEventListener('click', async () => {
      const amount = selectedDonationAmount > 0 ? selectedDonationAmount : 25;

      // Feedback de carregamento
      btnProceedVizionpay.disabled = true;
      btnProceedVizionpay.querySelector('.btn-text').textContent = 'Gerando código Pix...';

      try {
        const response = await fetch('/api/vizionpay/create-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            campaignId: currentDonationCampaign ? currentDonationCampaign.id : null,
            amount: amount,
            payer: {
              name: 'Apoiador Anônimo',
              email: 'contato@vakinha.com.br',
              cpf: '',
              phone: ''
            },
            method: selectedMethod
          })
        });

        if (!response.ok) {
          throw new Error('Falha ao processar pagamento');
        }

        const data = await response.json();
        activeVizionpayTxId = data.transactionId;

        // Preenche dados da tela Pix
        document.getElementById('vizionpayCheckoutAmount').textContent = formatCurrency(amount);
        document.getElementById('vizionpayQrCodeImg').src = data.qrCodeDataUrl;
        document.getElementById('pixKeyInput').value = data.pixCopiaECola;

        const statusText = document.getElementById('vizionpayStatusText');
        if (statusText) statusText.textContent = 'Aguardando pagamento no app do seu banco...';

        // Alterna para tela de QR Code
        document.getElementById('vizionpayStep1').style.display = 'none';
        document.getElementById('vizionpayStepPix').style.display = 'block';

        // Inicia cronômetro e polling
        startVizionpayCountdown();
        startStatusPolling(data.transactionId);

        showToast('Código Pix gerado com sucesso! Escaneie o QR Code.', 'info');
      } catch (err) {
        console.error('Erro no checkout:', err);
        showToast('Erro ao gerar código Pix. Tente novamente.', 'error');
      } finally {
        btnProceedVizionpay.disabled = false;
        btnProceedVizionpay.querySelector('.btn-text').textContent = 'Continuar para Doação';
      }
    });
  }

  // Copiar Chave Pix Copia e Cola
  const copyPixBtn = document.getElementById('copyPixBtn');
  if (copyPixBtn) {
    copyPixBtn.addEventListener('click', () => {
      const input = document.getElementById('pixKeyInput');
      input.select();
      navigator.clipboard.writeText(input.value);
      copyPixBtn.classList.add('copied');
      copyPixBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        <span>Copiado!</span>
      `;
      showToast('Chave Pix Copia e Cola copiada! 💰', 'success');

      setTimeout(() => {
        copyPixBtn.classList.remove('copied');
        copyPixBtn.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
          <span>Copiar</span>
        `;
      }, 3000);
    });
  }

  // Voltar da tela de QR Code para a Etapa 1
  const btnBackToStep1 = document.getElementById('btnBackToStep1');
  if (btnBackToStep1) {
    btnBackToStep1.addEventListener('click', () => {
      clearInterval(vizionpayPollTimer);
      clearInterval(vizionpayCountdownTimer);
      document.getElementById('vizionpayStepPix').style.display = 'none';
      document.getElementById('vizionpayStep1').style.display = 'block';
    });
  }

  // Finalizar e Fechar Modal
  const btnFinishDonation = document.getElementById('btnFinishDonation');
  if (btnFinishDonation) {
    btnFinishDonation.addEventListener('click', () => {
      closeAllModals();
    });
  }

  // Create Campaign Modal
  document.getElementById('btnCreateCampaignHeader').addEventListener('click', (e) => {
    e.preventDefault();
    createModal.classList.add('active');
  });

  document.getElementById('btnCreateCampaignHero').addEventListener('click', (e) => {
    e.preventDefault();
    createModal.classList.add('active');
  });

  document.getElementById('createCampaignForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const title = document.getElementById('newTitle').value.trim();
    const goal = parseFloat(document.getElementById('newGoal').value) || 5000;
    const categoryName = document.getElementById('newCategory').value;
    const city = document.getElementById('newCity').value.trim() || 'São Paulo';
    const state = document.getElementById('newState').value || 'SP';
    const description = document.getElementById('newDescription').value.trim();
    const creator = document.getElementById('newCreator').value.trim() || 'Você';

    const newId = Math.floor(5400000 + Math.random() * 99999);
    const newCamp = {
      id: newId,
      title: title,
      slug: `vaquinha-${newId}`,
      category: 'custom',
      categoryName: categoryName,
      description: description,
      fullDescription: `<p>${description}</p>`,
      goal: goal,
      collectedValue: 0,
      collectedPercentValue: 0,
      image: 'https://static.vakinha.com.br/static/v4/vaquinha_default.png?ims=700x410',
      city: city,
      state: state,
      creator: creator,
      creatorAvatar: `https://ui-avatars.com/api/?background=24ca68&color=fff&name=${encodeURIComponent(creator)}`,
      donorsCount: 0,
      stickersCount: 0,
      donorAvatars: [],
      verified: true,
      isSpotlight: true
    };

    campaigns.unshift(newCamp);
    closeAllModals();
    showToast(`Sua vaquinha "${title}" foi criada e publicada com sucesso! 🚀`, 'success');
    applyFilters();
  });

  // Filter Drawer / Dialog
  document.getElementById('btnFilterTrigger').addEventListener('click', () => {
    filterModal.classList.add('active');
  });

  document.getElementById('applyFilterBtn').addEventListener('click', () => {
    activeState = document.getElementById('filterStateSelect').value;
    closeAllModals();
    applyFilters();
    showToast('Filtros aplicados com sucesso.');
  });

  // Close Modals Helper
  const closeAllModals = () => {
    clearInterval(vizionpayPollTimer);
    clearInterval(vizionpayCountdownTimer);
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
    mobileDrawer.classList.remove('open');
    mobileOverlay.classList.remove('active');
  };

  document.querySelectorAll('.modal-close-btn').forEach(btn => {
    btn.addEventListener('click', closeAllModals);
  });

  document.querySelectorAll('.modal-overlay').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeAllModals();
    });
  });

  // Mobile Menu
  document.getElementById('mobileMenuBtn').addEventListener('click', () => {
    mobileDrawer.classList.add('open');
    mobileOverlay.classList.add('active');
  });

  mobileOverlay.addEventListener('click', closeAllModals);

  // Initial Render
  applyFilters();

  // Abrir vaquinha automaticamente se o link contiver o parâmetro ?v=ID
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const sharedId = urlParams.get('v') || urlParams.get('campanha');
    if (sharedId) {
      const campIdNum = parseInt(sharedId, 10);
      if (!isNaN(campIdNum)) {
        setTimeout(() => {
          window.openDetailModal(campIdNum);
        }, 300);
      }
    }
  } catch (e) {
    console.warn('Erro ao processar URL de compartilhamento:', e);
  }
});
