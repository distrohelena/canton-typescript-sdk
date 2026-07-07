import { DecentralizedNamespaceDefinition } from "./decentralized-namespace-definition.js";
import { DynamicSequencingParameters } from "./dynamic-sequencing-parameters.js";
import { DynamicSynchronizerParameters } from "./dynamic-synchronizer-parameters.js";
import { LsuAnnouncement } from "./lsu-announcement.js";
import { LsuSequencerConnectionSuccessor } from "./lsu-sequencer-connection-successor.js";
import { MediatorSynchronizerState } from "./mediator-synchronizer-state.js";
import { NamespaceDelegation } from "./namespace-delegation.js";
import { OwnerToKeyMapping } from "./owner-to-key-mapping.js";
import { ParticipantSynchronizerPermission } from "./participant-synchronizer-permission.js";
import { PartyHostingLimits } from "./party-hosting-limits.js";
import { PartyToKeyMapping } from "./party-to-key-mapping.js";
import { PartyToParticipant } from "./party-to-participant.js";
import { SequencerSynchronizerState } from "./sequencer-synchronizer-state.js";
import { SynchronizerTrustCertificate } from "./synchronizer-trust-certificate.js";
import { VettedPackages } from "./vetted-packages.js";

export type TopologyMapping =
    | DecentralizedNamespaceDefinition
    | DynamicSequencingParameters
    | DynamicSynchronizerParameters
    | LsuAnnouncement
    | LsuSequencerConnectionSuccessor
    | MediatorSynchronizerState
    | NamespaceDelegation
    | OwnerToKeyMapping
    | ParticipantSynchronizerPermission
    | PartyHostingLimits
    | PartyToKeyMapping
    | PartyToParticipant
    | SequencerSynchronizerState
    | SynchronizerTrustCertificate
    | VettedPackages;
