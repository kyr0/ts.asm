import MnemonicX86 from '../../x86/MnemonicX86';
import MnemonicVariationsX86 from '../../x86/MnemonicVariationsX86';
import * as a from '../atoms';

const mnemonic_add_0 = new MnemonicX86;
mnemonic_add_0.mnemonic                = "vblendpd";
mnemonic_add_0.operandSize             = 128;
mnemonic_add_0.opcode                  = 13;
mnemonic_add_0.operandTemplates        = [[a.xmm], [a.xmm], [a.xmm, a.m], [a.imm8]];
mnemonic_add_0.opreg                   = -1;
mnemonic_add_0.operandSizeDefault      = 32;
mnemonic_add_0.lock                    = false;
mnemonic_add_0.regInOp                 = false;
mnemonic_add_0.opcodeDirectionBit      = false;
mnemonic_add_0.useModrm                = true;
mnemonic_add_0.rep                     = false;
mnemonic_add_0.repne                   = false;
mnemonic_add_0.prefixes                = null;
mnemonic_add_0.opEncoding              = "rvm";
mnemonic_add_0.rex                     = null;
mnemonic_add_0.vex                     = {"vvvv":"NDS","L":0,"pp":1,"mmmmm":3,"W":1,"WIG":true};
mnemonic_add_0.evex                    = null;
mnemonic_add_0.mode                    = 63;
mnemonic_add_0.extensions              = [24];

const mnemonic_add_1 = new MnemonicX86;
mnemonic_add_1.mnemonic                = "vblendpd";
mnemonic_add_1.operandSize             = 256;
mnemonic_add_1.opcode                  = 13;
mnemonic_add_1.operandTemplates        = [[a.ymm], [a.ymm], [a.ymm, a.m], [a.imm8]];
mnemonic_add_1.opreg                   = -1;
mnemonic_add_1.operandSizeDefault      = 32;
mnemonic_add_1.lock                    = false;
mnemonic_add_1.regInOp                 = false;
mnemonic_add_1.opcodeDirectionBit      = false;
mnemonic_add_1.useModrm                = true;
mnemonic_add_1.rep                     = false;
mnemonic_add_1.repne                   = false;
mnemonic_add_1.prefixes                = null;
mnemonic_add_1.opEncoding              = "rvm";
mnemonic_add_1.rex                     = null;
mnemonic_add_1.vex                     = {"vvvv":"NDS","L":1,"pp":1,"mmmmm":3,"W":1,"WIG":true};
mnemonic_add_1.evex                    = null;
mnemonic_add_1.mode                    = 63;
mnemonic_add_1.extensions              = [24];

const x86_mnemonic_variations_vblendpd = new MnemonicVariationsX86([
    mnemonic_add_0,
    mnemonic_add_1,
]);
x86_mnemonic_variations_vblendpd.defaultOperandSize = 32;

export default x86_mnemonic_variations_vblendpd;
